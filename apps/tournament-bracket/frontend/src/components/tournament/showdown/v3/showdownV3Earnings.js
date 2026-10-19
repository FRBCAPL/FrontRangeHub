/**
 * V3 earnings for one event: qualifying ledger, playoff ledger, playoff status and settlement, all
 * derived from recorded results, the locked plan, confirmed byes and audited adjustments.
 * Before qualifiers are known, every entrant who has not withdrawn is still in the event.
 */
import { v3QualifyingLedger } from './showdownV3Qualifying.js';
import { v3PlayoffLedger } from './showdownV3Playoffs.js';
import { v3PlayoffStatus } from './showdownV3Outcome.js';
import { settleV3 } from './showdownV3Settlement.js';

export function computeV3Earnings({
  plan, playerIds, matches, byeIds = [], qualifierIds = [], withdrawnIds = [], seedOrder,
  outcome = 'in-progress', adjustments = [], qualifyingClosed = false, creditSnapshot = null,
}) {
  const qualifyingMatches = matches.filter((m) => m.phase === 'qualifying');
  const playoffMatches = matches.filter((m) => m.phase === 'playoff');
  const qualifying = v3QualifyingLedger(plan, playerIds, qualifyingMatches, { final: qualifyingClosed, snapshot: creditSnapshot });
  const playoffs = v3PlayoffLedger(plan, playoffMatches, { byeIds });
  const inEvent = qualifierIds.length ? qualifierIds : playerIds;
  const status = v3PlayoffStatus(plan, playoffMatches, { qualifierIds: inEvent, withdrawnIds });
  const order = seedOrder || [...qualifierIds, ...playerIds.filter((id) => !qualifierIds.includes(id))];
  const settlement = settleV3({ plan, playerIds, qualifying, playoffs, status, outcome, seedOrder: order, adjustments });
  return { qualifying, playoffs, status, settlement };
}
