/**
 * Integer upper bounds on champion fixed earnings H used to prune the optimizer search. Both are
 * relaxations (they drop constraints), so they stay valid for any additional rule that removes ladders.
 */
import { championShare } from './cashClimbV3Protection.js';
import { ceilingFloor } from './cashClimbV3Ceiling.js';

/**
 * Upper bound on H over completions of stages i+1.. after payout q at stage i (cum = C_i).
 * Continuous relaxation: with the last non-final payout y, every earlier free payout is at its smallest,
 * v_k = max(q + k - i, v_(k+1) / r), and the final x = rem - sum c_k v_k must satisfy x <= r y. H never
 * rises with y, so the smallest such y gives the bound; champion share <= 0.8 x + 0.4.
 */
export function upperH(space, i, q, rem, cum) {
  const { K, counts, ceiling } = space;
  if (i === K - 2) return rem > q && rem <= ceilingFloor(q, ceiling) ? cum + championShare(rem) : -Infinity;
  const r = ceiling.units / 10 ** ceiling.decimals;
  const at = (y) => {
    let v = y;
    let s = y;
    let x = rem - counts[K - 2] * y;
    for (let k = K - 3; k > i; k -= 1) {
      v = Math.max(q + (k - i), v / r);
      s += v;
      x -= counts[k] * v;
    }
    return { s, x, gap: x - r * y };
  };
  // gap(y) = x(y) - r y falls with y and is linear between the points where some v_k leaves its floor.
  const start = q + (K - 2 - i);
  const ys = [start];
  for (let k = K - 3; k > i; k -= 1) {
    const y = (q + (k - i)) * r ** (K - 2 - k);
    if (y > start) ys.push(y);
  }
  ys.sort((a, b) => a - b);
  let prev = at(ys[0]);
  if (prev.gap <= 0) return Math.floor(cum + prev.s + 0.8 * prev.x + 0.4 + 1e-6);
  let y = null;
  for (let n = 1; n < ys.length && y === null; n += 1) {
    const cur = at(ys[n]);
    if (cur.gap <= 0) y = ys[n - 1] + (prev.gap * (ys[n] - ys[n - 1])) / (prev.gap - cur.gap);
    prev = cur;
  }
  if (y === null) {
    const far = ys[ys.length - 1] + 1;
    const slope = at(far).gap - prev.gap;
    if (slope >= 0) return -Infinity;
    y = ys[ys.length - 1] + prev.gap / -slope;
  }
  const f = at(y * (1 - 1e-12));
  return Math.floor(cum + f.s + 0.8 * f.x + 0.4 + 1e-6);
}

/**
 * Second upper bound on H that keeps the 98% cumulative floors need[k] but drops the middle ceiling
 * links: each free payout is the smallest meeting its floor and cumulative need (raising the latest stage
 * is always cheapest), and the last non-final payout y is the smallest with x <= r y.
 */
export function upperHCumulative(space, i, q, rem, cum, need) {
  const { K, counts, ceiling } = space;
  if (i === K - 2) return -Infinity;
  const r = ceiling.units / 10 ** ceiling.decimals;
  let c = cum;
  let x = rem;
  for (let k = i + 1; k < K - 2; k += 1) {
    const v = Math.max(q + (k - i), need[k] - c);
    c += v;
    x -= counts[k] * v;
  }
  const yMin = Math.max(q + (K - 2 - i), need[K - 2] - c);
  const y = Math.max(yMin, x / (counts[K - 2] + r));
  return Math.floor(c + y + 0.8 * (x - counts[K - 2] * y) + 0.4 + 1e-6);
}
