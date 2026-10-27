/**
 * Cash Climb V3 event state: configuration, an explicit approved later-round ladder, the bracket matches
 * with their money allocations, and the ledger. The ladder is always an input here; no optimizer runs.
 *
 * Match allocations: preliminary H, main opening M, later round i ladder[i] (the championship gets the
 * combined championship allocation). They sum to the prize pool exactly.
 *
 * A match slot holds { entrant: id } or { winnerOf: matchId }; who actually occupies it is derived from
 * the upstream result (see cashClimbV3Progress). `feedsTo` points at the downstream slot a winner fills.
 */
import { cashClimbV3Config } from './cashClimbV3Config.js';
import { cashClimbV3Budget } from './cashClimbV3Budget.js';
import { ladderProblems } from './cashClimbV3Ladder.js';
import { buildCashClimbV3Bracket } from './cashClimbV3Bracket.js';
import { createLedger } from './cashClimbV3Ledger.js';

export const CASH_CLIMB_V3_EVENT_VERSION = 1;

function toMatches(bracket, budget, ladder) {
  const H = budget.reserves.preliminary.dollars;
  const M = budget.reserves.main.dollars;
  const lastRound = bracket.later.length - 1;
  const list = [
    ...bracket.preliminary.map((m) => ({ id: m.id, stage: 'preliminary', round: null, slots: m.players.map((entrant) => ({ entrant })), allocationCents: H * 100, kind: 'preliminary-reserve' })),
    ...bracket.opening.map((m) => ({ id: m.id, stage: 'opening', round: null, slots: m.slots, allocationCents: M * 100, kind: 'opening-reserve' })),
    ...bracket.later.flatMap((r) => r.matches.map((m) => ({
      id: m.id, stage: 'later', round: r.round, label: r.label, slots: m.slots,
      allocationCents: ladder[r.round] * 100, kind: r.round === lastRound ? 'championship' : 'later-award',
    }))),
  ];
  const matches = {};
  list.forEach((m) => {
    matches[m.id] = { ...m, championship: m.kind === 'championship', feedsTo: null, status: 'open', result: null, winner: null };
  });
  list.forEach((m) => m.slots.forEach((s, slot) => {
    if (s.winnerOf) matches[s.winnerOf].feedsTo = { matchId: m.id, slot };
  }));
  return { matches, order: list.map((m) => m.id) };
}

/**
 * @param input { id?, settings: {entrants, entryFeeCents, addedMoneyCents, raceTo}, entrantIds, placement, ladder }
 * `settings.entrants` must equal entrantIds.length. Throws with plain-English reasons when invalid.
 */
export function createCashClimbV3Event({ id = null, settings, entrantIds, placement, ladder }) {
  if (!Array.isArray(entrantIds) || entrantIds.length !== settings?.entrants) {
    throw new Error('The entrant list must match the configured number of entrants.');
  }
  const config = cashClimbV3Config(settings);
  const budget = cashClimbV3Budget(config);
  if (budget.problems.length) throw new Error(budget.problems.join(' '));
  const lp = ladderProblems(budget, ladder);
  if (lp.length) throw new Error(lp.join(' '));
  const bracket = buildCashClimbV3Bracket(entrantIds, placement);
  const { matches, order } = toMatches(bracket, budget, ladder);
  const allocations = {};
  order.forEach((mid) => { allocations[mid] = { cents: matches[mid].allocationCents, kind: matches[mid].kind }; });
  const ledger = createLedger({ prizePoolCents: budget.prizePool * 100, allocations });
  return {
    id,
    format: config.format,
    version: CASH_CLIMB_V3_EVENT_VERSION,
    config,
    ladder: [...ladder],
    reserves: { mainDollars: budget.reserves.main.dollars, preliminaryDollars: budget.reserves.preliminary.dollars },
    entrants: [...entrantIds],
    matches,
    order,
    championshipId: order[order.length - 1],
    ledger,
    settlement: null,
  };
}
