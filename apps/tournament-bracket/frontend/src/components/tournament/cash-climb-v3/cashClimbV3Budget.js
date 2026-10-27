/**
 * Cash Climb V3 money budget, in whole dollars:
 *   P = N E + A
 *   T = (N - B) H + (B/2) M          (opening reserve; preliminary byes pay nothing and reserve nothing)
 *   Q = P - T                        (later-round budget, paid as sum(stage matches x stage payout))
 * The configuration is rejected when no ladder meeting the mandatory constraints can sum to Q exactly.
 */
import { prizePoolCents } from './cashClimbV3Config.js';
import { cashClimbV3Shape } from './cashClimbV3Bracket.js';
import { openingReserves } from './cashClimbV3Opening.js';
import { cashClimbV3Ceiling } from './cashClimbV3Ceiling.js';
import { searchLadder } from './cashClimbV3LadderSearch.js';
import { ceilRatio, centsToDollars, formatDollars } from './cashClimbV3Money.js';

/** ceil(0.25 E): the smallest first later-round payout allowed. */
export const minimumFirstWin = (entryFeeCents) => ceilRatio(entryFeeCents, 400);
/** ceil(0.30 E): the preferred first later-round payout (a target, not a constraint). */
export const preferredFirstWin = (entryFeeCents) => ceilRatio(entryFeeCents * 30, 10000);

/** Smallest weighted total any valid ladder can have: f, f+1, f+2, ... */
export const minimumLadderTotal = (counts, minFirst) => counts.reduce((s, c, i) => s + c * (minFirst + i), 0);

/** Exact feasibility of the later-round budget: 'feasible', 'infeasible', or 'unknown' (search limit). */
export function ladderFeasibility({ counts, total, minFirst, ceiling }) {
  if (total < minimumLadderTotal(counts, minFirst)) return { status: 'infeasible', witness: null };
  const r = searchLadder({ counts, total, minFirst, ceiling });
  if (r.status === 'found') return { status: 'feasible', witness: r.ladder };
  return { status: r.status === 'none' ? 'infeasible' : 'unknown', witness: null };
}

/** Full budget for a validated configuration (see cashClimbV3Config). */
export function cashClimbV3Budget(config) {
  const shape = cashClimbV3Shape(config.entrants);
  const reserves = openingReserves(config);
  const M = reserves.main.dollars;
  const H = reserves.preliminary.dollars;
  const prizePool = centsToDollars(prizePoolCents(config));
  const openingReserve = shape.preliminaryMatches * H + shape.mainOpeningMatches * M;
  const laterBudget = prizePool - openingReserve;
  const counts = shape.laterRounds.map((r) => r.matches);
  const minFirst = minimumFirstWin(config.entryFeeCents);
  const ceiling = cashClimbV3Ceiling(config);
  const feasibility = laterBudget > 0
    ? ladderFeasibility({ counts, total: laterBudget, minFirst, ceiling })
    : { status: 'infeasible', witness: null };
  const problems = [];
  if (feasibility.status === 'infeasible') {
    problems.push(`The prize pool (${formatDollars(prizePool)}) cannot fund the opening reserve (${formatDollars(openingReserve)}) and a valid later-round payout ladder.`);
  } else if (feasibility.status === 'unknown') {
    problems.push('Could not confirm that a valid later-round payout ladder exists for this prize pool.');
  }
  return Object.freeze({
    shape,
    reserves,
    prizePool,
    openingReserve,
    laterBudget,
    stages: shape.laterRounds,
    counts,
    minimumFirstWin: minFirst,
    preferredFirstWin: preferredFirstWin(config.entryFeeCents),
    minimumLadderTotal: minimumLadderTotal(counts, minFirst),
    ceiling,
    feasibility,
    problems,
  });
}
