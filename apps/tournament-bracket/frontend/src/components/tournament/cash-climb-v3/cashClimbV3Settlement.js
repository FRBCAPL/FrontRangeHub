/**
 * Cash Climb V3 final settlement, once every match is resolved.
 *
 * Normal (championship completed): all unawarded money becomes finalist bonuses, champion
 *   round_half_up(80%) and runner-up the remainder. The whole prize pool is then distributed.
 * Exceptional (championship not completed: decided by forfeit, walkover, double forfeit, void, or begun
 *   and interrupted by one or two withdrawals): earned payouts stand, the sole survivor's unplayed-match
 *   half-awards were already paid as the bracket resolved, no new championship award for an interrupted
 *   championship, no finalist bonuses, and unawarded money is operator-retained. One withdrawal makes the
 *   other finalist champion by withdrawal; two withdrawals leave no champion.
 */
import { roundHalfUpRatio } from './cashClimbV3Money.js';
import { entitlementKey, ledgerProblems, ledgerSummary, settleInLedger } from './cashClimbV3Ledger.js';

const EXCEPTIONAL = ['forfeit', 'walkover', 'double-forfeit', 'void', 'withdrawal', 'double-withdrawal'];

export function settlementStatus(event) {
  if (event.settlement) return { ready: false, mode: event.settlement.mode, reason: 'The event is already settled.' };
  const open = event.order.filter((id) => event.matches[id].status === 'open');
  if (open.length) return { ready: false, mode: null, reason: `${open.length} match(es) still to be resolved.` };
  const champ = event.matches[event.championshipId];
  if (champ.status === 'completed') return { ready: true, mode: 'normal', reason: null };
  if (EXCEPTIONAL.includes(champ.status)) return { ready: true, mode: 'exceptional', reason: null };
  return { ready: false, mode: null, reason: `Unexpected championship status: ${champ.status}.` };
}

function bonusEntries(event, unawardedCents) {
  const champ = event.matches[event.championshipId];
  const dollars = unawardedCents / 100;
  const champion = roundHalfUpRatio(4 * dollars, 5);
  const pay = (role, playerId, d) => (d > 0 ? [{ key: entitlementKey('settlement', role, playerId), matchId: null, type: role, playerId, cents: d * 100 }] : []);
  return {
    championId: champ.result.winner,
    runnerUpId: champ.result.loser,
    entries: [...pay('finalist-bonus-champion', champ.result.winner, champion), ...pay('finalist-bonus-runner-up', champ.result.loser, dollars - champion)],
  };
}

/** Returns a new, settled event. Settling a settled event returns it unchanged. */
export function settleCashClimbV3(event) {
  if (event.settlement) return event;
  const status = settlementStatus(event);
  if (!status.ready) throw new Error(status.reason);
  const unawarded = ledgerSummary(event.ledger).unawardedCents;
  const champ = event.matches[event.championshipId];
  let ledger;
  let settlement;
  if (status.mode === 'normal') {
    const b = bonusEntries(event, unawarded);
    ledger = settleInLedger(event.ledger, b.entries, 0);
    settlement = { mode: 'normal', championId: b.championId, runnerUpId: b.runnerUpId, championBasis: 'completed', finalistBonusCents: unawarded, operatorRetainedCents: 0 };
  } else {
    ledger = settleInLedger(event.ledger, [], unawarded);
    settlement = {
      mode: 'exceptional',
      championId: champ.winner,
      runnerUpId: null,
      championBasis: champ.winner ? champ.status : null,
      finalistBonusCents: 0,
      operatorRetainedCents: unawarded,
    };
  }
  const problems = ledgerProblems(ledger);
  if (ledgerSummary(ledger).unsettledCents !== 0) problems.push('Settlement left an unsettled balance.');
  if (problems.length) throw new Error(problems.join(' '));
  return { ...event, ledger, settlement };
}
