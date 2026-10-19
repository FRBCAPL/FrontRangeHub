/**
 * V3 settlement (cents). Earned pay (qualifying games and credits, playoff games, match wins, byes) is
 * never reduced; settlement only decides where the remainder goes. The remainder is the pool minus earned
 * pay and adjustments: unused playoff game reserve, the bridge saving, unplayed and forfeited qualifying
 * games, match-win pay nobody earned and the ladder's leftover cents.
 *
 *   in-progress       — the remainder is held (not paid yet)
 *   completed         — the remainder goes to the champion (the playoff reserve remainder)
 *   interrupted-final — the final was not finished: the remainder (which includes the final's match-win
 *                       pay) is split between the two finalists
 *   interrupted       — the event stopped before the final: the remainder is split among the players still
 *                       eligible immediately before the interruption (before the playoffs, every entrant who
 *                       has not withdrawn; during the playoffs, the playoff players not yet eliminated or
 *                       withdrawn). When nobody was still eligible the remainder is left unresolved for an
 *                       operator-reviewed settlement; it is never assigned automatically.
 *   abandoned         — every remaining playoff player withdrew voluntarily: a separately disclosed
 *                       exception, never a 100% player payout. Players keep what they earned; the remainder
 *                       is unawarded and recorded separately as proposed operator-retained funds. Retention
 *                       and live settlement of this exception are not approved yet.
 * Splits are paid in the plan's money unit (50¢ for original-formula plans, 25¢ for equal-rate plans);
 * leftover units go to the earliest recipients in current standings order.
 */
import { applyV3Adjustments } from './showdownV3Adjustments.js';
import { V3_UNIT_CENTS, formatCents, v3UnitCents, isUnitMultiple, unitText } from './showdownV3Rules.js';

export const V3_OUTCOMES = ['in-progress', 'completed', 'interrupted-final', 'interrupted', 'abandoned'];
export const V3_ABANDONMENT_RETENTION_APPROVED = false;

export function v3UnresolvedDisclosure(cents) {
  return `Nobody was still eligible when the event was interrupted, so ${formatCents(cents)} is unresolved. It is not assigned to anyone automatically: the operator must review it and record any payout as an audited adjustment.`;
}

/** Splits `cents` in `unit`-cent units among recipients listed highest seed first. */
export function splitUnits(cents, recipients, unit) {
  const units = Math.floor(cents / unit);
  const each = Math.floor(units / recipients.length);
  const extra = units - each * recipients.length;
  const out = {};
  recipients.forEach((id, i) => { out[id] = (each + (i < extra ? 1 : 0)) * unit; });
  return out;
}

/** Splits `cents` in 50¢ units (original-formula plans). */
export const splitHalfUnits = (cents, recipients) => splitUnits(cents, recipients, V3_UNIT_CENTS);

function outcomeProblem(outcome, status) {
  if (!V3_OUTCOMES.includes(outcome)) return `Unknown V3 outcome "${outcome}".`;
  if (outcome === 'completed' && !status.championId) return 'A completed event needs a champion.';
  if (outcome !== 'completed' && outcome !== 'in-progress' && status.championId) return 'The championship was decided; settle the event as completed.';
  if (outcome === 'interrupted-final') {
    const ok = status.aliveIds.length === 2 && status.aliveIds.every((id) => status.finalistIds.includes(id));
    if (!ok) return 'An interrupted final needs both finalists still in the event.';
  }
  if (outcome === 'abandoned' && status.aliveIds.length) return 'Players are still in the playoffs, so the event was not abandoned.';
  return '';
}

/**
 * qualifying / playoffs: ledgers from v3QualifyingLedger / v3PlayoffLedger. status: v3PlayoffStatus.
 * seedOrder: every player, highest seed first (qualifiers by rank, then everyone else).
 */
export function settleV3({ plan, playerIds, qualifying, playoffs, status, outcome, seedOrder = playerIds, adjustments = [] }) {
  const problems = [];
  const unit = v3UnitCents(plan);
  const rows = {};
  playerIds.forEach((id) => {
    const q = qualifying.rows[id] || {};
    const p = playoffs.rows[id] || {};
    const earned = (q.actualCents || 0) + (q.creditCents || 0) + (p.totalCents || 0);
    rows[id] = {
      playerId: id,
      qualifyingActualCents: q.actualCents || 0,
      qualifyingCreditCents: q.creditCents || 0,
      playoffGameCents: p.gameCents || 0,
      playoffMatchWinCents: p.matchWinCents || 0,
      byeCents: p.byeCents || 0,
      earnedCents: earned,
      adjustmentCents: 0,
      settlementCents: 0,
    };
  });
  const earnedTotal = playerIds.reduce((s, id) => s + rows[id].earnedCents, 0);
  const adj = applyV3Adjustments(adjustments, { playerIds, remainderCents: plan.poolCents - earnedTotal, unitCents: unit });
  problems.push(...adj.problems);
  Object.entries(adj.byPlayer).forEach(([id, v]) => { rows[id].adjustmentCents = v; });

  const remainder = adj.remainderCents;
  const problem = outcomeProblem(outcome, status);
  if (problem) problems.push(problem);
  if (remainder < 0) problems.push(`Earned pay exceeds the prize pool by ${formatCents(-remainder)}.`);
  if (!isUnitMultiple(remainder, unit)) problems.push(`The remainder is not a multiple of ${unitText(unit)}.`);
  qualifying.matches.filter((m) => !m.withinBudget).forEach((m) => problems.push(`Qualifying match ${m.matchId} pays more than its budget.`));
  problems.push(...playoffs.problems);

  let held = 0; let unawarded = 0; let unresolved = 0; let recipients = [];
  const disclosures = [];
  if (!problem && remainder > 0) {
    if (outcome === 'in-progress') held = remainder;
    else if (outcome === 'abandoned') {
      unawarded = remainder;
      disclosures.push(`Exception: every remaining playoff player withdrew voluntarily. Players keep what they earned. ${formatCents(remainder)} was not awarded to any player and is recorded separately as proposed operator-retained funds; retaining it is not approved yet.`);
    } else if (outcome === 'interrupted' && !status.aliveIds.length) {
      unresolved = remainder;
      disclosures.push(v3UnresolvedDisclosure(remainder));
    } else {
      const pool = outcome === 'completed' ? [status.championId] : status.aliveIds;
      recipients = seedOrder.filter((id) => pool.includes(id));
      const split = splitUnits(remainder, recipients, unit);
      Object.entries(split).forEach(([id, v]) => { rows[id].settlementCents = v; });
    }
  }
  Object.values(rows).forEach((r) => { r.totalCents = r.earnedCents + r.adjustmentCents + r.settlementCents; });
  const paidCents = Object.values(rows).reduce((s, r) => s + r.totalCents, 0);
  if (Object.values(rows).some((r) => r.totalCents < 0 || !isUnitMultiple(r.totalCents, unit))) problems.push(`Every payout must be $0 or more, in ${unitText(unit)} steps.`);
  if (!problem && paidCents + held + unawarded + unresolved !== plan.poolCents) problems.push('Payouts do not reconcile to the prize pool.');
  const pendingApproval = [];
  if (outcome === 'abandoned' && !V3_ABANDONMENT_RETENTION_APPROVED) pendingApproval.push('abandonment-retention');
  if (unresolved) pendingApproval.push('interruption-review');
  return {
    ok: problems.length === 0,
    problems,
    outcome,
    rows,
    poolCents: plan.poolCents,
    paidCents,
    remainderCents: remainder,
    heldCents: held,
    unawardedCents: unawarded,
    unresolvedCents: unresolved,
    proposedOperatorRetainedCents: unawarded,
    retentionApproved: unawarded ? V3_ABANDONMENT_RETENTION_APPROVED : null,
    bonusRecipients: recipients,
    pendingApproval,
    disclosures,
  };
}
