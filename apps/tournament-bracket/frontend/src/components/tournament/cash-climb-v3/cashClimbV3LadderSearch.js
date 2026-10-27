/**
 * Exact search for a whole-dollar later-round ladder p[0..K-1] with
 *   p[0] >= minFirst, p[i+1] > p[i], p[i+1] <= r p[i], sum(counts[i] x p[i]) = total.
 *
 * Without `ideal`, candidates are tried in ascending order, so the result is a feasibility witness, not
 * a payout proposal. With `ideal(i, remaining, prev)`, candidates closest to that value are tried first
 * (lower first on ties). Bound pruning plus a memo of failed states keep the search exact; it stops with
 * status 'limit' if `maxStates` is reached rather than guessing.
 */
import { ceilingFloor } from './cashClimbV3Ceiling.js';

function candidates(lo, hi, centre) {
  if (lo > hi) return [];
  if (centre === null) {
    const out = [];
    for (let q = lo; q <= hi; q += 1) out.push(q);
    return out;
  }
  const c = Math.min(hi, Math.max(lo, Math.round(centre)));
  const out = [c];
  for (let d = 1; c - d >= lo || c + d <= hi; d += 1) {
    if (c - d >= lo) out.push(c - d);
    if (c + d <= hi) out.push(c + d);
  }
  return out;
}

export function searchLadder({ counts, total, minFirst, ceiling, ideal = null, maxStates = 2000000 }) {
  const K = counts.length;
  const suffix = counts.map((_, i) => counts.slice(i).reduce((a, b) => a + b, 0));
  const minRest = (i, prev) => counts.slice(i).reduce((s, c, j) => s + c * (prev + 1 + j), 0);
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
  const failed = new Set();
  const out = [];
  let states = 0;
  const go = (i, prev, rem) => {
    if (i === K) return rem === 0;
    states += 1;
    if (states > maxStates) throw new RangeError('limit');
    const key = `${i}:${prev}:${rem}`;
    if (failed.has(key)) return false;
    const lo = i === 0 ? minFirst : prev + 1;
    let hi = Math.floor(rem / suffix[i]);
    if (i > 0) hi = Math.min(hi, ceilingFloor(prev, ceiling));
    if (i === K - 1) {
      const q = rem / counts[i];
      if (Number.isInteger(q) && q >= lo && q <= hi) { out.push(q); return true; }
      failed.add(key);
      return false;
    }
    for (const q of candidates(lo, hi, ideal ? ideal(i, rem, prev) : null)) {
      const left = rem - counts[i] * q;
      if (left < minRest(i + 1, q) || left > maxRest(i + 1, q)) continue;
      out.push(q);
      if (go(i + 1, q, left)) return true;
      out.pop();
    }
    failed.add(key);
    return false;
  };
  try {
    return go(0, 0, total) ? { status: 'found', ladder: out } : { status: 'none', ladder: null };
  } catch (e) {
    if (e instanceof RangeError && e.message === 'limit') return { status: 'limit', ladder: null };
    throw e;
  }
}
