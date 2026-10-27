/**
 * Cash Climb V3 production payout optimizer (deterministic, exact). Final selection process:
 *
 *   1. Prize pool P = N E + A and opening reserves T (preliminary H, main opening M).   cashClimbV3Budget
 *   2. Later-round budget Q = P - T.                                                     cashClimbV3Budget
 *   3. Exact reference ladder: smallest weighted deviation from 2.45x growth.            cashClimbV3Reference
 *   4. Mandatory constraints: whole dollars, p[0] >= ceil(E/4), strictly increasing, adaptive ceiling
 *      p[i+1] <= r p[i], sum(c[i] p[i]) = Q exactly.                                     cashClimbV3LadderSpace
 *   5. 99% champion protection: 100 H(p) >= 99 H(ref).                                 cashClimbV3Protection
 *   6. 98% cumulative protection at every non-final stage.                              cashClimbV3Protection
 *   7. 90% relative growth protection at every stage: 10 p[j] ref[j-1] >= 9 p[j-1] ref[j].
 *   8. Deterministic choice among the qualifying ladders (p[0] >= reference p[0]):
 *        a. highest first award p[0]
 *        b. then highest champion fixed earnings H(p)
 *        c. then smallest sum_i c[i] |p[i] - ref[i]|
 *        d. then the lexicographically smallest ladder.
 *      The reference itself always qualifies, so a feasible budget always yields a ladder.
 *   9. The last payout is the fixed championship allocation, split 80/20: champion
 *      round_half_up(0.8 x allocation), runner-up the remainder.                        cashClimbV3Championship
 *
 * The fixed championship allocation is part of the ladder and is earned when the championship is
 * played. Separately, at normal settlement (championship completed) any prize money left unawarded by
 * the bracket (opening-reserve leftovers, interrupted or forfeited matches) is paid as a finalist bonus,
 * again 80/20; it is not part of the ladder and is not known in advance (see cashClimbV3Settlement).
 *
 * The ceil(0.30 E) first-win target is reported only; it never changes the choice.
 *
 * Exact branch and bound: first awards are tried from highest to lowest and the first one with any
 * qualifying ladder wins. Within it, stages are tried in ascending order; branches are cut only by exact
 * integer bounds (cashClimbV3OptimizerBounds) and by the smallest payout each rule allows.
 */
import { ladderSpace } from './cashClimbV3LadderSpace.js';
import { findReferenceLadder } from './cashClimbV3Reference.js';
import { championEarnings, championShare, cumulativeEarnings, growthRetentionPercents, retentionFloor } from './cashClimbV3Protection.js';
import { upperH, upperHCumulative } from './cashClimbV3OptimizerBounds.js';

export const CASH_CLIMB_V3_OPTIMIZER_ID = 'cash-climb-v3-reference-2026-10-r90';

function bestForFirst(space, ref, p0) {
  const { K, counts } = space;
  const refH = championEarnings(ref);
  const refC = cumulativeEarnings(ref);
  const need = refC.map((v) => (98 * v) / 100);
  /** Smallest payout for stage j after prev: strictly increasing and 90% growth retention. */
  const step = (j, prev) => Math.max(prev + 1, retentionFloor(prev, ref[j - 1], ref[j]));
  const minRest = (i, prev) => {
    let s = 0;
    let v = prev;
    for (let j = i; j < K; j += 1) { v = step(j, v); s += counts[j] * v; }
    return s;
  };
  const upper = (i, q, rem, cum) => {
    const a = upperH(space, i, q, rem, cum);
    return i === K - 2 ? a : Math.min(a, upperHCumulative(space, i, q, rem, cum, need));
  };
  const left0 = space.total - counts[0] * p0;
  if (left0 < minRest(1, p0) || left0 > space.maxRest(1, p0)) return null;
  if (100 * upper(0, p0, left0, p0) < 99 * refH) return null;
  let best = null;
  const p = [p0];
  const go = (i, prev, rem, cum, dev) => {
    if (i === K - 1) {
      const q = space.last(prev, rem);
      if (q === null || q < step(i, prev)) return;
      const h = cum + championShare(q);
      if (100 * h < 99 * refH) return;
      const d = dev + Math.abs(q - ref[i]);
      if (!best || h > best.h || (h === best.h && d < best.dev)) best = { ladder: [...p, q], h, dev: d };
      return;
    }
    for (const q of space.choices(i, prev, rem)) {
      if (q < step(i, prev)) continue;
      const c = cum + q;
      if (100 * c < 98 * refC[i]) continue;
      const left = rem - counts[i] * q;
      if (left < minRest(i + 1, q)) continue;
      const ub = upper(i, q, left, c);
      if (100 * ub < 99 * refH || (best && ub < best.h)) continue;
      const d = dev + counts[i] * Math.abs(q - ref[i]);
      if (best && ub === best.h && d > best.dev) continue;
      p[i] = q;
      go(i + 1, q, left, c, d);
    }
    p.length = i;
  };
  go(1, p0, left0, p0, counts[0] * Math.abs(p0 - ref[0]));
  return best;
}

/**
 * @param input { counts, total, minFirst, preferredFirst?, ceiling }
 * @returns { status: 'found' | 'none', reference, ladder, championEarnings, growthRetention, ... }
 */
export function selectCashClimbV3Ladder(input) {
  const ref = findReferenceLadder(input);
  if (ref.status !== 'found') return { status: 'none', reference: null, ladder: null };
  const space = ladderSpace(input);
  const { counts, total } = space;
  const top = Math.floor((total - counts.reduce((s, c, i) => s + c * i, 0)) / space.suffix[0]);
  for (let p0 = top; p0 >= ref.ladder[0]; p0 -= 1) {
    const best = bestForFirst(space, ref.ladder, p0);
    if (best) {
      return {
        status: 'found',
        reference: { ladder: ref.ladder, deviation: ref.deviation, championEarnings: championEarnings(ref.ladder) },
        ladder: best.ladder,
        championEarnings: best.h,
        deviationFromReference: best.dev,
        growthRetention: growthRetentionPercents(ref.ladder, best.ladder),
        preferredFirst: input.preferredFirst ?? null,
        meetsPreferredFirst: input.preferredFirst == null ? null : best.ladder[0] >= input.preferredFirst,
      };
    }
  }
  throw new Error('The reference ladder failed its own protections; this is a defect.');
}

export const CASH_CLIMB_V3_PRODUCTION_OPTIMIZER = Object.freeze({
  id: CASH_CLIMB_V3_OPTIMIZER_ID,
  experimental: false,
  select: selectCashClimbV3Ladder,
  solve(input) {
    const r = selectCashClimbV3Ladder(input);
    return r.status === 'found' ? r.ladder : null;
  },
});
