/**
 * ANALYSIS ONLY (Tasks 2C / 2D). Not used by production payouts.
 *
 * The approved optimized-ladder selection (highest first award >= reference first award, then highest
 * champion fixed earnings, then smallest weighted distance from the reference, then lexicographically
 * smallest), with every mandatory rule and both protections, plus optional candidate rules, all exact:
 *   floor      { num, den }                 p[i+1] den >= num p[i]                     (p[i+1] >= ceil(g p[i]))
 *   retention  { num, den, scope }          p[i+1] ref[i] den >= num ref[i+1] p[i]      for every stage
 *                                           ('all') or only the first transition ('first')
 *   cap        { num, den }                 p[0] den <= num ref[0]                      (p[0] <= floor(c ref[0]))
 * With no rules it is the pre-Task 2E selection; with { retention: 90/100 'all' } (adopted in Task 2E)
 * it must select exactly what the production optimizer selects. The production H upper bounds stay valid
 * because every rule only removes ladders.
 */
import { ladderSpace } from '../cashClimbV3LadderSpace.js';
import { upperH, upperHCumulative } from '../cashClimbV3OptimizerBounds.js';
import { championEarnings, championShare, cumulativeEarnings } from '../cashClimbV3Protection.js';

export const GROWTH_FLOORS = Object.freeze([
  { label: '1.50x', num: 3, den: 2 },
  { label: '1.60x', num: 8, den: 5 },
  { label: '1.70x', num: 17, den: 10 },
  { label: '1.75x', num: 7, den: 4 },
  { label: '1.80x', num: 9, den: 5 },
]);

const ceilDiv = (a, b) => Math.floor((a + b - 1) / b);

/** Smallest next payout allowed by the floor: ceil(g x prev). */
export const floorNext = (prev, g) => (g ? ceilDiv(g.num * prev, g.den) : prev + 1);

export const meetsFloor = (ladder, g) => !g || ladder.every((v, i) => i === 0 || v * g.den >= g.num * ladder[i - 1]);

const retains = (rules, j) => rules.retention && (rules.retention.scope === 'all' || j === 1);

/** Smallest payout for stage j given stage j-1 pays prev, under every rule. */
function stepper(ref, rules) {
  return (j, prev) => {
    let v = Math.max(prev + 1, floorNext(prev, rules.floor));
    if (retains(rules, j)) {
      const { num, den } = rules.retention;
      v = Math.max(v, ceilDiv(num * ref[j] * prev, den * ref[j - 1]));
    }
    return v;
  };
}

/** True when the ladder meets every candidate rule against the reference. */
export function meetsRules(ladder, ref, rules) {
  if (!meetsFloor(ladder, rules.floor)) return false;
  if (rules.cap && ladder[0] * rules.cap.den > rules.cap.num * ref[0]) return false;
  return ladder.every((v, j) => j === 0 || !retains(rules, j) || v * ref[j - 1] * rules.retention.den >= rules.retention.num * ref[j] * ladder[j - 1]);
}

function search(space, ref, p0, rules) {
  const { K, counts } = space;
  const refH = championEarnings(ref);
  const refC = cumulativeEarnings(ref);
  const need = refC.map((v) => (98 * v) / 100);
  const step = stepper(ref, rules);
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
 * @param input optimizer input { counts, total, minFirst, ceiling }
 * @param reference the reference ladder the protections and rules are measured against
 * @param rules { floor?, retention?, cap? } (see top)
 * @returns { status: 'found' | 'infeasible', ladder, championEarnings, belowReferenceFirst? }
 *   When infeasible, `belowReferenceFirst` reports the best ladder that exists only if the first award
 *   could drop below the reference first award (diagnostic; the approved rules forbid it).
 */
export function selectWithRules(input, reference, rules = {}) {
  const space = ladderSpace(input);
  let top = Math.floor((space.total - space.counts.reduce((s, c, i) => s + c * i, 0)) / space.suffix[0]);
  if (rules.cap) top = Math.min(top, Math.floor((rules.cap.num * reference[0]) / rules.cap.den));
  for (let p0 = top; p0 >= reference[0]; p0 -= 1) {
    const best = search(space, reference, p0, rules);
    if (best) return { status: 'found', ladder: best.ladder, championEarnings: best.h };
  }
  for (let p0 = reference[0] - 1; p0 >= input.minFirst; p0 -= 1) {
    const best = search(space, reference, p0, rules);
    if (best) return { status: 'infeasible', ladder: null, belowReferenceFirst: best.ladder };
  }
  return { status: 'infeasible', ladder: null, belowReferenceFirst: null };
}

export const selectWithGrowthFloor = (input, reference, g) => selectWithRules(input, reference, { floor: g });
