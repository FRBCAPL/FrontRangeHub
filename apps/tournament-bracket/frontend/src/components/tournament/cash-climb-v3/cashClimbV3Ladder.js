/**
 * Later-round payout ladder: mandatory-constraint validation and the optimizer interface.
 *
 * Ladder p[i] is the award for each match won in later round i (play order); the last entry is the
 * combined championship allocation. Mandatory constraints:
 *   1. every payout is a positive whole-dollar amount
 *   2. p[0] >= ceil(0.25 E)
 *   3. payouts strictly increase by stage
 *   4. p[i+1] <= r p[i] (adaptive ceiling)
 *   5. sum(stage matches x p[i]) = Q exactly
 * Protections (99% champion, 98% cumulative, 90% growth retention) are relative to the reference ladder,
 * so they are checked when the optimizer reports its reference (see cashClimbV3Protection.js), and
 * reported separately as `eligibility` for explicit ladders.
 *
 * An optimizer is { id, experimental, solve(input) -> number[] | null, select?(input) -> details }.
 * The production optimizer is the exact reference-ladder optimizer in cashClimbV3Optimizer.js.
 */
import { withinCeiling } from './cashClimbV3Ceiling.js';
import { CASH_CLIMB_V3_PRODUCTION_OPTIMIZER } from './cashClimbV3Optimizer.js';
import { findReferenceLadder } from './cashClimbV3Reference.js';
import { protectionProblems } from './cashClimbV3Protection.js';

export const PRODUCTION_LADDER_OPTIMIZER = CASH_CLIMB_V3_PRODUCTION_OPTIMIZER;
export const REFERENCE_GROWTH = 2.45;
export const UNVERIFIED_LADDER_CHECKS = Object.freeze([]);

export const ladderWeightedTotal = (counts, ladder) => counts.reduce((s, c, i) => s + c * ladder[i], 0);

/** Plain-English mandatory-constraint violations. Empty when the ladder is valid for the budget. */
export function ladderProblems(budget, ladder) {
  const { counts, laterBudget, minimumFirstWin, ceiling } = budget;
  if (!Array.isArray(ladder) || ladder.length !== counts.length) {
    return [`The ladder must have ${counts.length} payouts, one per later round.`];
  }
  const problems = [];
  ladder.forEach((p, i) => {
    if (!Number.isSafeInteger(p) || p <= 0) problems.push(`Payout ${i + 1} must be a positive whole-dollar amount.`);
  });
  if (problems.length) return problems;
  if (ladder[0] < minimumFirstWin) problems.push(`The first later-round payout must be at least $${minimumFirstWin}.`);
  for (let i = 1; i < ladder.length; i += 1) {
    if (ladder[i] <= ladder[i - 1]) problems.push(`Payout ${i + 1} must be more than payout ${i}.`);
    else if (!withinCeiling(ladder[i - 1], ladder[i], ceiling)) problems.push(`Payout ${i + 1} grows more than the ${ceiling.value.toFixed(4)}x ceiling allows.`);
  }
  const total = ladderWeightedTotal(counts, ladder);
  if (total !== laterBudget) problems.push(`Later-round awards total $${total}, not the $${laterBudget} budget.`);
  return problems;
}

/** Everything an optimizer may use. */
export function ladderOptimizerInput(budget, entryFeeCents) {
  return Object.freeze({
    counts: budget.counts,
    total: budget.laterBudget,
    minFirst: budget.minimumFirstWin,
    preferredFirst: budget.preferredFirstWin,
    ceiling: budget.ceiling,
    referenceGrowth: REFERENCE_GROWTH,
    entryFeeCents,
  });
}

/**
 * Runs an optimizer and checks its ladder against every mandatory constraint, and against the earnings
 * protections when the optimizer reports a reference ladder. Passing optimizer null gives 'unavailable'.
 */
export function proposeLaterRoundLadder(budget, entryFeeCents, optimizer = PRODUCTION_LADDER_OPTIMIZER) {
  const base = { optimizer: optimizer ? { id: optimizer.id, experimental: optimizer.experimental !== false } : null, unverified: UNVERIFIED_LADDER_CHECKS };
  if (!optimizer) return { ...base, status: 'unavailable', ladder: null, problems: ['No payout-ladder optimizer was supplied.'] };
  if (budget.problems?.length) return { ...base, status: 'invalid', ladder: null, problems: [...budget.problems] };
  const input = ladderOptimizerInput(budget, entryFeeCents);
  const details = optimizer.select ? optimizer.select(input) : null;
  const ladder = details ? details.ladder : optimizer.solve(input);
  if (!ladder) return { ...base, status: 'invalid', ladder: null, problems: ['The optimizer found no ladder.'] };
  const reference = details?.reference?.ladder || null;
  const problems = [...ladderProblems(budget, ladder), ...(reference ? protectionProblems(reference, ladder) : [])];
  return { ...base, status: problems.length ? 'invalid' : 'valid', ladder: [...ladder], reference: reference ? [...reference] : null, problems };
}

/**
 * Whether a structurally valid ladder could be an optimized production ladder: it must keep every
 * reference-relative protection (99% champion, 98% cumulative, 90% growth retention) against the exact
 * production reference ladder. Being eligible does not mean it is the optimizer's choice.
 */
export function productionEligibility(budget, ladder, entryFeeCents = null) {
  if (ladderProblems(budget, ladder).length) return { status: 'ineligible', reference: null, problems: ['The ladder fails the mandatory constraints.'] };
  const ref = findReferenceLadder(ladderOptimizerInput(budget, entryFeeCents));
  if (ref.status !== 'found') return { status: 'unavailable', reference: null, problems: ['No reference ladder exists for this budget.'] };
  const problems = protectionProblems(ref.ladder, ladder);
  return { status: problems.length ? 'ineligible' : 'eligible', reference: [...ref.ladder], problems };
}

/**
 * Explicit, operator- or test-supplied ladder. `status` / `problems` cover structural validity (the
 * mandatory constraints) only, so injected fixtures keep working; `eligibility` separately reports the
 * reference-relative protections an optimized production ladder must also meet.
 */
export function explicitLaterRoundLadder(budget, ladder, entryFeeCents = null) {
  const problems = ladderProblems(budget, ladder);
  const eligibility = budget.problems?.length ? { status: 'unavailable', reference: null, problems: [...budget.problems] } : productionEligibility(budget, ladder, entryFeeCents);
  return { optimizer: null, source: 'explicit', unverified: UNVERIFIED_LADDER_CHECKS, status: problems.length ? 'invalid' : 'valid', ladder: Array.isArray(ladder) ? [...ladder] : null, reference: null, problems, eligibility };
}
