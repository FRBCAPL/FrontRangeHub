/**
 * Verifies a saved, started Cash Climb (V3) event by replaying its saved results through the engine on a
 * fresh bracket built from the saved placement and locked ladder. The saved record is never replaced;
 * it either matches the replay exactly (bracket, advancements, ledger, settlement) or is reported.
 */
import { createCashClimbV3Event } from '../cashClimbV3Event.js';
import { recordMatchResult, startCashClimbV3Event } from '../cashClimbV3Progress.js';
import { settleCashClimbV3 } from '../cashClimbV3Settlement.js';
import { sameValue as same } from './cashClimbV3SameValue.js';

const AUTOMATIC = ['walkover', 'void'];
const byKey = (entries) => [...entries].sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));

export function replayProblems(raw) {
  if (raw.status === 'setup') return [];
  const saved = raw.event;
  let e = startCashClimbV3Event(createCashClimbV3Event({
    id: raw.id, settings: saved.config, entrantIds: raw.players.map((p) => p.id), placement: raw.placement, ladder: raw.payout.ladder,
  }));
  for (const id of saved.order) {
    const m = saved.matches[id];
    if (m.status === 'open' || AUTOMATIC.includes(m.status)) continue;
    try {
      e = recordMatchResult(e, id, m.result).event;
    } catch (err) {
      return [`The saved result for match ${id} is not valid: ${err.message}`];
    }
  }
  if (saved.settlement) {
    try {
      e = settleCashClimbV3(e);
    } catch (err) {
      return [`The saved settlement is not valid: ${err.message}`];
    }
  }
  const problems = [];
  const fields = (m) => [m.status, m.winner, m.result];
  if (saved.order.some((id) => !same(fields(saved.matches[id]), fields(e.matches[id])))) problems.push('The saved results and advancements do not match the bracket.');
  const ledger = saved.ledger;
  if (!same(byKey(ledger.entries), byKey(e.ledger.entries)) || !same(Object.keys(ledger.resolved).sort(), Object.keys(e.ledger.resolved).sort())
    || ledger.operatorRetainedCents !== e.ledger.operatorRetainedCents) {
    problems.push('The saved payouts do not match the recorded results.');
  }
  if (!same(saved.settlement, e.settlement)) problems.push('The saved settlement does not match the recorded results.');
  return problems;
}
