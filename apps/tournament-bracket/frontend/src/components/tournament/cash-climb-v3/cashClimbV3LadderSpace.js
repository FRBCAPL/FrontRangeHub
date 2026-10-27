/**
 * The space of ladders meeting the mandatory constraints (positive whole dollars, p[0] >= minFirst,
 * strictly increasing, p[i+1] <= r p[i] at the fixed-precision ceiling, sum(counts[i] x p[i]) = total),
 * with exact integer bounds the production searches use to skip stages that cannot be completed.
 * The last stage always has count 1, so its payout is whatever budget remains.
 */
import { ceilingFloor, withinCeiling } from './cashClimbV3Ceiling.js';

export function ladderSpace({ counts, total, minFirst, ceiling }) {
  const K = counts.length;
  const suffix = counts.map((_, i) => counts.slice(i).reduce((a, b) => a + b, 0));
  /** Smallest weighted total of stages i.. when the previous payout is prev. */
  const minRest = (i, prev) => {
    let s = 0;
    for (let j = i; j < K; j += 1) s += counts[j] * (prev + 1 + j - i);
    return s;
  };
  /** Largest weighted total of stages i.. under the ceiling chain, or -1 if the chain stalls. */
  const maxRest = (i, prev) => {
    let s = 0;
    let v = prev;
    for (let j = i; j < K; j += 1) {
      const next = ceilingFloor(v, ceiling);
      if (next <= v) return -1;
      v = next;
      s += counts[j] * v;
    }
    return s;
  };
  /** Payouts q for stage i (< K-1) that leave a completable remainder. */
  const choices = (i, prev, rem) => {
    const lo = i === 0 ? minFirst : prev + 1;
    let hi = Math.floor(rem / suffix[i]);
    if (i > 0) hi = Math.min(hi, ceilingFloor(prev, ceiling));
    const out = [];
    for (let q = lo; q <= hi; q += 1) {
      const left = rem - counts[i] * q;
      if (left >= minRest(i + 1, q) && left <= maxRest(i + 1, q)) out.push(q);
    }
    return out;
  };
  /** Final payout when stages 0..K-2 are fixed, or null when it breaks a constraint. */
  const last = (prev, rem) => {
    const q = rem / counts[K - 1];
    return Number.isInteger(q) && q > prev && withinCeiling(prev, q, ceiling) ? q : null;
  };
  /** True when p meets every mandatory constraint. */
  const contains = (p) => Array.isArray(p) && p.length === K && p.every(Number.isSafeInteger) && p[0] >= minFirst
    && p.every((v, i) => i === 0 || (v > p[i - 1] && withinCeiling(p[i - 1], v, ceiling)))
    && p.reduce((s, v, i) => s + counts[i] * v, 0) === total;
  return { K, counts, total, minFirst, ceiling, suffix, minRest, maxRest, choices, last, contains };
}
