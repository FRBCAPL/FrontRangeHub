/**
 * Cash Climb V3 reference ladder.
 *
 * Objective. With g = 2.45 = 49/20 and stage match counts c[i], the reference deviation of a ladder p is
 *     D(p) = min over a >= 0 of  sum_i c[i] |p[i] - a g^i|
 * where a (the first reference award) is a free real variable. As a function of a this is convex and
 * piecewise linear with breakpoints a = p[j] / g^j, so the minimum is attained at one of them:
 *     D(p) = min over j of  sum_i c[i] |p[i] - p[j] g^(i-j)|.
 * Scaling by L = 980^(K-1) = (49 x 20)^(K-1) makes every term an integer:
 *     L D(p) = min_j sum_i c[i] |p[i] 49^(K-1) 20^(K-1) - p[j] 49^(K-1+i-j) 20^(K-1-i+j)|
 * which is compared exactly with BigInt.
 *
 * Reference ladder = the ladder meeting the mandatory constraints with the smallest D(p); ties go to the
 * lexicographically smallest ladder. The search is an exact branch and bound: a floating-point lower
 * bound only discards branches that are worse by more than EPS (far above any rounding error), and every
 * winner and tie is decided by the exact integer comparison.
 */
import { ladderSpace } from './cashClimbV3LadderSpace.js';
import { searchLadder } from './cashClimbV3LadderSearch.js';
import { ceilingFloor } from './cashClimbV3Ceiling.js';

export const REFERENCE_GROWTH_NUM = 49;
export const REFERENCE_GROWTH_DEN = 20;
const G = REFERENCE_GROWTH_NUM / REFERENCE_GROWTH_DEN;
const EPS = 1e-6;

function tables(K) {
  const n = BigInt(REFERENCE_GROWTH_NUM);
  const d = BigInt(REFERENCE_GROWTH_DEN);
  const k = BigInt(K - 1);
  const factor = [];
  for (let i = 0; i < K; i += 1) {
    factor.push([]);
    for (let j = 0; j < K; j += 1) factor[i].push(n ** (k + BigInt(i - j)) * d ** (k - BigInt(i - j)));
  }
  return { scale: (n * d) ** k, self: n ** k * d ** k, factor };
}

const cache = new Map();
const tablesFor = (K) => (cache.has(K) ? cache.get(K) : cache.set(K, tables(K)).get(K));

/** Exact deviation: { scaled (BigInt, = L x D), scale (BigInt L), anchor j, dollars (display only) }. */
export function referenceDeviation(counts, ladder) {
  const K = counts.length;
  const t = tablesFor(K);
  let best = null;
  let anchor = 0;
  for (let j = 0; j < K; j += 1) {
    let s = 0n;
    for (let i = 0; i < K; i += 1) {
      const diff = BigInt(ladder[i]) * t.self - BigInt(ladder[j]) * t.factor[i][j];
      s += BigInt(counts[i]) * (diff < 0n ? -diff : diff);
    }
    if (best === null || s < best) { best = s; anchor = j; }
  }
  return { scaled: best, scale: t.scale, anchor, dollars: Number(best) / Number(t.scale) };
}

function deviationFloat(counts, p) {
  let best = Infinity;
  for (let j = 0; j < p.length; j += 1) {
    let s = 0;
    for (let i = 0; i < p.length; i += 1) s += counts[i] * Math.abs(p[i] - p[j] * G ** (i - j));
    best = Math.min(best, s);
  }
  return best;
}

/**
 * Lower bound on D for every completion of the prefix p[0..m] (float; used only to discard).
 * Each later payout lies in [lo_i, hi_i]. For a fixed a with targets z_i = a g^i, any completion costs at
 * least sum c_i dist(z_i, [lo_i, hi_i]) + |rem - sum c_i clamp(z_i)|, since moving a payout away from its
 * clamped value costs one weighted dollar per budget dollar. The bound is piecewise linear in a, so its
 * minimum is at a breakpoint or where the clamped total crosses rem.
 */
export function lowerBound(space, p, m, rem) {
  const { K, counts, suffix } = space;
  const lo = [];
  const hi = [];
  let h = p[m];
  let acc = 0;
  for (let i = m + 1; i < K; i += 1) {
    lo[i] = p[m] + (i - m);
    h = ceilingFloor(h, space.ceiling);
    hi[i] = Math.min(h, Math.floor((rem - acc) / suffix[i]));
    if (hi[i] < lo[i]) return Infinity;
    acc += counts[i] * lo[i];
  }
  const evaluate = (a) => {
    let cost = 0;
    let sum = 0;
    for (let i = 0; i < K; i += 1) {
      const z = a * G ** i;
      if (i <= m) { cost += counts[i] * Math.abs(p[i] - z); continue; }
      const c = Math.min(hi[i], Math.max(lo[i], z));
      cost += counts[i] * Math.abs(c - z);
      sum += counts[i] * c;
    }
    return { cost, sum };
  };
  const points = [0];
  for (let i = 0; i < K; i += 1) {
    const gi = G ** i;
    if (i <= m) points.push(p[i] / gi);
    else points.push(lo[i] / gi, hi[i] / gi);
  }
  points.sort((x, y) => x - y);
  const vals = points.map(evaluate);
  let best = Infinity;
  vals.forEach((v, k) => {
    best = Math.min(best, v.cost + Math.abs(rem - v.sum));
    const w = vals[k + 1];
    if (w && (v.sum - rem) * (w.sum - rem) < 0) {
      const a = points[k] + ((rem - v.sum) * (points[k + 1] - points[k])) / (w.sum - v.sum);
      const x = evaluate(a);
      best = Math.min(best, x.cost + Math.abs(rem - x.sum));
    }
  });
  return best;
}

const lexLess = (a, b) => {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

/**
 * @param input { counts, total, minFirst, ceiling }
 * @returns { status: 'found' | 'none', ladder, deviation, nodes }
 */
export function findReferenceLadder(input) {
  const space = ladderSpace(input);
  const { K, counts } = space;
  let best = null;
  let nodes = 0;
  const consider = (ladder) => {
    const f = deviationFloat(counts, ladder);
    if (best && f > best.float + EPS) return;
    const exact = referenceDeviation(counts, ladder);
    if (!best || exact.scaled < best.exact.scaled || (exact.scaled === best.exact.scaled && lexLess(ladder, best.ladder))) {
      best = { ladder, float: f, exact };
    }
  };
  const seed = searchLadder({ ...input, ideal: (i, remaining) => remaining / counts.slice(i).reduce((s, c, j) => s + c * G ** j, 0) });
  if (seed.status === 'found' && space.contains(seed.ladder)) consider(seed.ladder);
  const p = new Array(K);
  const go = (i, prev, rem) => {
    nodes += 1;
    if (i === K - 1) {
      const q = space.last(prev, rem);
      if (q !== null) { p[i] = q; consider([...p]); }
      return;
    }
    for (const q of space.choices(i, prev, rem)) {
      p[i] = q;
      const left = rem - counts[i] * q;
      if (best && lowerBound(space, p, i, left) > best.float + EPS) continue;
      go(i + 1, q, left);
    }
  };
  go(0, 0, input.total);
  if (!best) return { status: 'none', ladder: null, deviation: null, nodes };
  return { status: 'found', ladder: best.ladder, deviation: best.exact, nodes };
}
