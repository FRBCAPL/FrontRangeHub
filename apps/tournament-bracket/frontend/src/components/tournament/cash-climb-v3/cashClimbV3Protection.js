/**
 * Earnings protections against the reference ladder (integer comparisons only).
 *
 * Champion fixed later-round earnings H(p) = sum of every non-final award + champion share of the final
 * allocation, where champion share = round_half_up(0.8 x final). Require 100 H(p) >= 99 H(ref).
 * Cumulative earnings through non-final stage j, C_j(p) = p[0] + ... + p[j]. Require
 * 100 C_j(p) >= 98 C_j(ref) for every j < K-1.
 * Relative growth retention at every stage transition j-1 -> j:
 *   p[j] / p[j-1] >= 0.90 x ref[j] / ref[j-1],  i.e.  10 p[j] ref[j-1] >= 9 p[j-1] ref[j].
 */

/** round_half_up(0.8 x) for a whole-dollar x >= 0: floor((8x + 5) / 10). */
export const championShare = (x) => Math.floor((8 * x + 5) / 10);

export function championEarnings(ladder) {
  const K = ladder.length;
  return ladder.slice(0, K - 1).reduce((s, v) => s + v, 0) + championShare(ladder[K - 1]);
}

export function cumulativeEarnings(ladder) {
  const out = [];
  ladder.slice(0, ladder.length - 1).reduce((s, v) => { out.push(s + v); return s + v; }, 0);
  return out;
}

export const CHAMPION_PROTECTION_PERCENT = 99;
export const CUMULATIVE_PROTECTION_PERCENT = 98;
export const GROWTH_RETENTION = Object.freeze({ num: 9, den: 10 });

/** True when stage j (paying `next`, after `prev`) keeps 90% of the reference growth ref[j]/ref[j-1]. */
export function retainsGrowth(prev, next, refPrev, refNext) {
  return BigInt(GROWTH_RETENTION.den) * BigInt(next) * BigInt(refPrev) >= BigInt(GROWTH_RETENTION.num) * BigInt(prev) * BigInt(refNext);
}

/** Smallest payout for a stage after `prev` that keeps 90% of the reference growth (exact ceiling). */
export function retentionFloor(prev, refPrev, refNext) {
  const n = GROWTH_RETENTION.num * prev * refNext;
  const d = GROWTH_RETENTION.den * refPrev;
  if (Number.isSafeInteger(n + d)) {
    const top = n + d - 1;
    let q = Math.floor(top / d);
    if (q * d > top) q -= 1;
    else if ((q + 1) * d <= top) q += 1;
    return q;
  }
  const num = BigInt(GROWTH_RETENTION.num) * BigInt(prev) * BigInt(refNext);
  const den = BigInt(GROWTH_RETENTION.den) * BigInt(refPrev);
  return Number((num + den - 1n) / den);
}

/** Growth retained at each transition, optimized ratio / reference ratio, as a percentage (display only). */
export const growthRetentionPercents = (reference, ladder) => ladder.slice(1)
  .map((v, i) => (100 * v * reference[i]) / (ladder[i] * reference[i + 1]));

/** Plain-English failures of the 99% champion and 98% cumulative earnings protections only. */
export function earningsProtectionProblems(reference, ladder) {
  const problems = [];
  const h = championEarnings(ladder);
  const hr = championEarnings(reference);
  if (100 * h < CHAMPION_PROTECTION_PERCENT * hr) problems.push(`Champion fixed earnings $${h} are below 99% of the reference $${hr}.`);
  const c = cumulativeEarnings(ladder);
  const cr = cumulativeEarnings(reference);
  c.forEach((v, j) => {
    if (100 * v < CUMULATIVE_PROTECTION_PERCENT * cr[j]) problems.push(`Cumulative earnings through stage ${j + 1} ($${v}) are below 98% of the reference $${cr[j]}.`);
  });
  return problems;
}

/** Plain-English protection failures of `ladder` against `reference` (all three). Empty when protected. */
export function protectionProblems(reference, ladder) {
  const problems = earningsProtectionProblems(reference, ladder);
  for (let j = 1; j < ladder.length; j += 1) {
    if (!retainsGrowth(ladder[j - 1], ladder[j], reference[j - 1], reference[j])) {
      problems.push(`Growth from stage ${j} to stage ${j + 1} keeps less than 90% of the reference growth.`);
    }
  }
  return problems;
}
