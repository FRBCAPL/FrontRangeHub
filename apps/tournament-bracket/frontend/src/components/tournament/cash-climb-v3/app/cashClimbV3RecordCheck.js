/**
 * Validation of a persisted Cash Climb (V3) record before it is opened. Nothing is repaired or
 * recalculated: a record either restores exactly as saved or is reported with plain-English problems.
 *
 * The locked ladder is checked against the mandatory constraints and the bracket is rebuilt from the
 * saved placement and locked ladder to confirm every match allocation; the optimizer is never run.
 */
import { cashClimbV3ConfigProblems, CASH_CLIMB_V3_FORMAT } from '../cashClimbV3Config.js';
import { cashClimbV3Budget } from '../cashClimbV3Budget.js';
import { ladderProblems } from '../cashClimbV3Ladder.js';
import { placementProblems } from '../cashClimbV3Bracket.js';
import { createCashClimbV3Event, CASH_CLIMB_V3_EVENT_VERSION } from '../cashClimbV3Event.js';
import { ledgerProblems } from '../cashClimbV3Ledger.js';
import { CASH_CLIMB_V3_OPTIMIZER_ID } from '../cashClimbV3Optimizer.js';
import { CASH_CLIMB_V3_RECORD_SCHEMA, CASH_CLIMB_V3_RECORD_TYPE, CASH_CLIMB_V3_STATUSES, playerProblems } from './cashClimbV3Record.js';
import { replayProblems } from './cashClimbV3Replay.js';
import { sameValue as same } from './cashClimbV3SameValue.js';

const OTHER_FORMATS = Object.freeze({
  'cash-climb': 'This is a Cash Climb: King of the Hill event. It cannot be opened as Cash Climb.',
  'cash-climb-showdown': 'This is a Cash Climb: Showdown event. It cannot be opened as Cash Climb.',
});

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const STATIC_MATCH_FIELDS = ['id', 'stage', 'round', 'label', 'slots', 'allocationCents', 'kind', 'championship', 'feedsTo'];
const pick = (m) => Object.fromEntries(STATIC_MATCH_FIELDS.map((k) => [k, m[k] ?? null]));

function envelopeProblems(raw) {
  if (!isObject(raw)) return ['The saved tournament is not readable.'];
  if (raw.type !== CASH_CLIMB_V3_RECORD_TYPE) return [OTHER_FORMATS[raw.type] || 'This saved tournament is not a Cash Climb event.'];
  if (raw.schemaVersion !== CASH_CLIMB_V3_RECORD_SCHEMA) {
    return [Number(raw.schemaVersion) > CASH_CLIMB_V3_RECORD_SCHEMA
      ? 'This tournament was saved by a newer version of the app. Update the app to open it.'
      : 'This saved tournament uses an unsupported record version.'];
  }
  const problems = [];
  if (typeof raw.id !== 'string' || !raw.id) problems.push('The saved tournament has no id.');
  if (typeof raw.name !== 'string' || !raw.name.trim()) problems.push('The saved tournament has no name.');
  if (!CASH_CLIMB_V3_STATUSES.includes(raw.status)) problems.push(`Unknown tournament status: ${raw.status}.`);
  if (!isObject(raw.event) || !isObject(raw.payout) || !isObject(raw.placement)) problems.push('The saved tournament is incomplete.');
  if (problems.length) return problems;
  if (raw.event.format !== CASH_CLIMB_V3_FORMAT) problems.push('The saved event is not a Cash Climb event.');
  if (raw.event.version !== CASH_CLIMB_V3_EVENT_VERSION) problems.push(`Unsupported Cash Climb engine version ${raw.event.version}.`);
  if (raw.event.id !== raw.id) problems.push('The saved event id does not match the tournament.');
  return problems;
}

function payoutProblems(raw, budget) {
  const { payout, event } = raw;
  const problems = [];
  if (typeof payout.optimizerId !== 'string' || !payout.optimizerId) problems.push('The locked payout has no optimizer id.');
  if (!same(payout.ladder, event.ladder)) problems.push('The locked payout ladder does not match the event.');
  problems.push(...ladderProblems(budget, payout.ladder).map((p) => `Locked ladder: ${p}`));
  if (payout.prizePoolCents !== budget.prizePool * 100 || event.ledger?.prizePoolCents !== payout.prizePoolCents) problems.push('The saved prize pool does not match the settings.');
  const reserves = { mainDollars: budget.reserves.main.dollars, preliminaryDollars: budget.reserves.preliminary.dollars };
  if (!same(payout.reserves, reserves) || !same(event.reserves, reserves)) problems.push('The saved reserves do not match the settings.');
  return problems;
}

function bracketProblems(raw) {
  const { event, payout, placement, players } = raw;
  let fresh;
  try {
    fresh = createCashClimbV3Event({ id: raw.id, settings: event.config, entrantIds: players.map((p) => p.id), placement, ladder: payout.ladder });
  } catch (err) {
    return [err.message];
  }
  const problems = [];
  if (!same(event.order, fresh.order) || event.championshipId !== fresh.championshipId) problems.push('The saved bracket order does not match the placement.');
  else if (fresh.order.some((id) => !isObject(event.matches?.[id]) || !same(pick(event.matches[id]), pick(fresh.matches[id])))) {
    problems.push('The saved matches or their allocations do not match the placement and locked ladder.');
  }
  if (!same(event.ledger?.allocations, fresh.ledger.allocations)) problems.push('The saved ledger allocations do not match the locked ladder.');
  return problems;
}

function stateProblems(raw) {
  const { event } = raw;
  const problems = ledgerProblems(event.ledger);
  event.order.forEach((id) => {
    if ((event.matches[id].status !== 'open') !== Boolean(event.ledger.resolved[id])) problems.push(`Match ${id} and the ledger disagree about its result.`);
  });
  if (raw.status === 'setup' && (Object.keys(event.ledger.resolved).length || event.ledger.entries.length || event.settlement)) {
    problems.push('A tournament in setup cannot have results or earnings.');
  }
  if ((raw.status === 'completed') !== Boolean(event.settlement)) problems.push('Only a settled tournament can be complete, and a settled tournament must be complete.');
  return problems;
}

function metadataProblems(raw) {
  const problems = [];
  if (raw.draw !== undefined && !(isObject(raw.draw) && raw.draw.method === 'random' && typeof raw.draw.adjusted === 'boolean')) problems.push('The saved draw details are not readable.');
  ['startedAt', 'completedAt'].forEach((k) => { if (raw[k] !== undefined && typeof raw[k] !== 'string') problems.push(`The saved ${k} time is not readable.`); });
  return problems;
}

/** Plain-English reasons the record cannot be opened. Empty when it restores exactly. */
export function cashClimbV3RecordProblems(raw) {
  const envelope = envelopeProblems(raw);
  if (envelope.length) return envelope;
  const meta = metadataProblems(raw);
  if (meta.length) return meta;
  const problems = playerProblems(raw.players);
  if (problems.length) return problems;
  const ids = raw.players.map((p) => p.id);
  if (!same(raw.event.entrants, ids)) return ['The saved entrants do not match the players.'];
  const config = cashClimbV3ConfigProblems(raw.event.config);
  if (config.length) return config;
  if (raw.event.config.entrants !== ids.length) return ['The saved entrant count does not match the players.'];
  const placement = placementProblems(ids, raw.placement);
  if (placement.length) return placement;
  const budget = cashClimbV3Budget(raw.event.config);
  if (budget.problems.length) return budget.problems;
  const payout = payoutProblems(raw, budget);
  if (payout.length) return payout;
  const bracket = bracketProblems(raw);
  if (bracket.length) return bracket;
  try {
    const state = stateProblems(raw);
    return state.length ? state : replayProblems(raw);
  } catch {
    return ['The saved results or ledger are not readable.'];
  }
}

/**
 * @returns { status: 'ok', record, optimizerCurrent } | { status: 'invalid', problems }
 * `optimizerCurrent` is false when the locked ladder came from an earlier optimizer; it is reported,
 * never acted on.
 */
export function restoreCashClimbV3Record(raw) {
  let problems;
  try {
    problems = cashClimbV3RecordProblems(raw);
  } catch {
    problems = ['The saved tournament is not readable.'];
  }
  if (problems.length) return { status: 'invalid', problems };
  return { status: 'ok', record: raw, optimizerCurrent: raw.payout.optimizerId === CASH_CLIMB_V3_OPTIMIZER_ID };
}
