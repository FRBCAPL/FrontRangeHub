/**
 * Operator payout adjustments for V3 (cents). Every adjustment is an explicit, audited record:
 *   { id, playerId, amountCents, reason, by, at }
 * Adjustments are funded only from the undistributed remainder (the money that would otherwise become the
 * champion bonus, a split or the unawarded balance), so the prize pool is never exceeded and an unfunded
 * adjustment is rejected. Earned pay is protected: a negative adjustment can only take back an earlier
 * adjustment to the same player, never pay the player earned from games, credits, match wins or byes.
 * Earned pay changes only through an audited result correction.
 * The locked plan, the ladder and recorded results are never changed by an adjustment.
 */
import { formatCents, isUnitMultiple, unitText, V3_UNIT_CENTS } from './showdownV3Rules.js';

/** `unitCents`: the locked plan's money unit (v3UnitCents); 50¢ for original-formula plans. */
export function v3AdjustmentProblem(adj, { playerIds, adjustedCents = {}, availableCents, unitCents = V3_UNIT_CENTS }) {
  if (!adj || !playerIds.includes(adj.playerId)) return 'Pick the player the adjustment is for.';
  if (!isUnitMultiple(adj.amountCents, unitCents) || adj.amountCents === 0) return `An adjustment must be a non-zero multiple of ${unitText(unitCents)}.`;
  if (!String(adj.reason || '').trim()) return 'Every adjustment needs a reason for the audit log.';
  if (!adj.by || !adj.at) return 'Every adjustment must record who made it and when.';
  if (adj.amountCents < 0 && (adjustedCents[adj.playerId] || 0) + adj.amountCents < 0) {
    return 'Earned pay cannot be reduced by an adjustment. Correct the result instead, or take back only an earlier adjustment.';
  }
  if (adj.amountCents > availableCents) {
    return `Only ${formatCents(availableCents)} is left undistributed; this adjustment needs ${formatCents(adj.amountCents)}.`;
  }
  return '';
}

/**
 * Applies adjustments in order against the remainder. Invalid records are reported, never skipped silently:
 * the returned `problems` make settlement fail until they are fixed.
 */
export function applyV3Adjustments(adjustments, { playerIds, remainderCents, unitCents = V3_UNIT_CENTS }) {
  const byPlayer = {};
  let available = remainderCents;
  const problems = [];
  adjustments.forEach((adj) => {
    const problem = v3AdjustmentProblem(adj, { playerIds, adjustedCents: byPlayer, availableCents: available, unitCents });
    if (problem) { problems.push(`Adjustment ${adj?.id || '?'}: ${problem}`); return; }
    byPlayer[adj.playerId] = (byPlayer[adj.playerId] || 0) + adj.amountCents;
    available -= adj.amountCents;
  });
  return { byPlayer, remainderCents: available, problems };
}

/** Audit detail for an adjustment. */
export function v3AdjustmentAudit(adj) {
  return {
    type: 'v3-adjustment',
    playerIds: [adj.playerId],
    details: { adjustmentId: adj.id, amountCents: adj.amountCents, reason: adj.reason, by: adj.by, at: adj.at, fundedFrom: 'remainder' },
  };
}
