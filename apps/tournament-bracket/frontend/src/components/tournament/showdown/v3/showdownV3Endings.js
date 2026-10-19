/**
 * V3-only ways an event ends besides a decided championship, and audited payout adjustments.
 *   interruptShowdown — the event stops early (emergency, venue closure, operator decision or any other
 *                       involuntary stop). Unfinished matches on a table keep the games already played.
 *                       The remainder goes to the players still eligible immediately before the interruption:
 *                       before the playoffs are confirmed every entrant who has not withdrawn; during the
 *                       playoffs the playoff players not yet eliminated or withdrawn (both finalists when only
 *                       the final is left). With nobody eligible it stays unresolved for operator review.
 *   abandonShowdown   — every remaining playoff player withdrew or forfeited voluntarily, as confirmed by the
 *                       operator: the separately disclosed exception (showdownV3Abandonment.js).
 *   adjustPayout      — after settlement, funded from the undistributed remainder only.
 * The outcome, the settlement snapshot and every adjustment are saved with the event.
 */
import { isPayoutV3 } from '../showdownPayoutVersion.js';
import { context, requireConfirm, requireStatus, withAudit } from '../showdownState.js';
import { v3InterruptedResult } from './showdownV3Results.js';
import { v3Limits, v3PartialScore } from './showdownV3Matches.js';
import { v3AbandonmentProblem, v3VoluntaryLeavers } from './showdownV3Abandonment.js';
import { computeEarningsV3, v3SettlementSnapshot } from './showdownV3Money.js';
import { v3CreditSnapshot } from './showdownV3Event.js';

function requireV3(state) {
  if (!isPayoutV3(state)) throw new Error('Only V3 events can be settled this way.');
}

function settled(state, outcome, c, action, detail = {}) {
  const e = computeEarningsV3(state, { outcome });
  if (!e.settlement.ok) throw new Error(`Payouts do not reconcile: ${e.settlement.problems[0]}`);
  const snapshot = v3SettlementSnapshot(e.settlement, c.now);
  const next = {
    ...state,
    status: 'completed',
    completedAt: c.now,
    championId: outcome === 'completed' ? e.status.championId : null,
    v3Outcome: { kind: outcome, at: c.now, by: c.by, stage: state.status },
    v3Settlement: snapshot,
  };
  return withAudit(next, c, action, snapshot.recipients, { ...detail, outcome, ...snapshot });
}

function interruptedMatches(state, scores, now) {
  const limits = v3Limits(state);
  return state.matches.map((m) => {
    if (m.status !== 'on-table') return m;
    const s = v3PartialScore(scores[m.id]);
    return v3InterruptedResult(m, s.score1, s.score2, limits, now);
  });
}

function interruptOutcome(state, e) {
  if (state.status !== 'playoffs') return 'interrupted';
  const final = e.status.finalMatch;
  const alive = e.status.aliveIds;
  const onlyFinal = final?.p1 && final?.p2 && alive.length === 2 && alive.every((id) => id === final.p1 || id === final.p2);
  return onlyFinal ? 'interrupted-final' : 'interrupted';
}

export const V3_UNRESOLVED_ACK_MESSAGE = 'Nobody is still eligible, so the remaining money cannot go to anyone automatically. Confirm that it will be left unresolved for your review.';

/** The event as it would stand once interrupted: matches on a table keep their games, nobody wins them. */
export function previewInterruption(state, { scores = {} } = {}, now = new Date().toISOString()) {
  let stopped = { ...state, matches: interruptedMatches(state, scores, now) };
  if (state.status === 'qualifying') {
    stopped = { ...stopped, qualification: { ...(state.qualification || {}), v3Credits: v3CreditSnapshot(stopped, now) } };
  }
  const outcome = interruptOutcome(stopped, computeEarningsV3(stopped, { outcome: 'in-progress' }));
  return { stopped, outcome, earnings: computeEarningsV3(stopped, { outcome }) };
}

/**
 * scores: { [matchId]: { score1, score2 } or { noGamesPlayed: true } }, required for every match on a table.
 * acknowledgeUnresolved: required when nobody is still eligible, so the remainder stays unresolved.
 */
export function interruptShowdown(state, { scores = {}, acknowledgeUnresolved = false } = {}, confirmText, ctxIn) {
  const c = context(ctxIn);
  requireV3(state);
  requireStatus(state, ['qualifying', 'shootout', 'bracket', 'playoffs'], 'Only a running event can be interrupted.');
  requireConfirm(confirmText);
  const { stopped, outcome, earnings } = previewInterruption(state, { scores }, c.now);
  if (earnings.settlement.unresolvedCents && acknowledgeUnresolved !== true) throw new Error(V3_UNRESOLVED_ACK_MESSAGE);
  return settled(stopped, outcome, c, 'v3-interrupt', { scores });
}

export function abandonShowdown(state, confirmText, ctxIn) {
  const c = context(ctxIn);
  requireV3(state);
  requireStatus(state, ['playoffs'], 'Only running playoffs can be recorded as abandoned.');
  requireConfirm(confirmText);
  const e = computeEarningsV3(state, { outcome: 'in-progress' });
  const problem = v3AbandonmentProblem(state, e.status);
  if (problem) throw new Error(problem);
  return settled(state, 'abandoned', c, 'v3-abandon', { voluntaryLeavers: v3VoluntaryLeavers(state) });
}

/** amountCents may be negative only to take back an earlier adjustment to the same player. */
export function adjustPayout(state, { playerId, amountCents, reason }, ctxIn) {
  const c = context(ctxIn);
  requireV3(state);
  requireStatus(state, ['completed'], 'Payout adjustments are recorded after the event is settled.');
  const adj = { id: c.newId('adj'), playerId, amountCents: Number(amountCents), reason: String(reason || '').trim(), by: c.by, at: c.now };
  const adjustments = [...(state.v3Adjustments || []), adj];
  const outcome = state.v3Outcome?.kind || 'completed';
  const e = computeEarningsV3(state, { outcome, adjustments });
  if (!e.settlement.ok) throw new Error(e.settlement.problems[0]);
  const next = { ...state, v3Adjustments: adjustments, v3Settlement: v3SettlementSnapshot(e.settlement, c.now) };
  return withAudit(next, c, 'v3-adjustment', [playerId], { adjustmentId: adj.id, amountCents: adj.amountCents, reason: adj.reason, fundedFrom: 'remainder' });
}
