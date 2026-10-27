/**
 * Adaptive multiplier ceiling for successive later-round payouts:
 *   r = min(3, 2 + 0.23 log2(N/16) + 0.35 A/(N E)),  p[i+1] <= r p[i]
 *
 * r is used at a fixed precision of CEILING_DECIMALS decimal places, always rounded DOWN, so the fixed
 * value never exceeds the mathematical ceiling. Comparisons are exact integer arithmetic on that value.
 * When N is a power of two, r is rational and is rounded down exactly. Otherwise r is irrational and is
 * rounded down from its floating-point value.
 */
export const MAX_CEILING = 3;
export const CEILING_DECIMALS = 4;
const SCALE = 10 ** CEILING_DECIMALS;

function powerOfTwoExponent(n) {
  let k = 0;
  let v = n;
  while (v > 1 && v % 2 === 0) { v /= 2; k += 1; }
  return v === 1 ? k : null;
}

function exactUnits(N, E, A, k) {
  const ne = BigInt(N) * BigInt(E);
  const num = 200n * ne + 23n * BigInt(k - 4) * ne + 35n * BigInt(A);
  const den = 100n * ne;
  return Number((num * BigInt(SCALE)) / den);
}

export function cashClimbV3Ceiling({ entrants: N, entryFeeCents: E, addedMoneyCents: A = 0 }) {
  const mathematical = 2 + 0.23 * Math.log2(N / 16) + (0.35 * A) / (N * E);
  const k = powerOfTwoExponent(N);
  const raw = k !== null ? exactUnits(N, E, A, k) : Math.floor(mathematical * SCALE);
  const units = Math.min(MAX_CEILING * SCALE, raw);
  return Object.freeze({
    units,
    decimals: CEILING_DECIMALS,
    value: units / SCALE,
    mathematical: Math.min(MAX_CEILING, mathematical),
    exactSource: k !== null,
    capped: units === MAX_CEILING * SCALE,
  });
}

/** True when next <= r x prev, with r at its fixed precision. */
export function withinCeiling(prev, next, ceiling) {
  return BigInt(next) * BigInt(SCALE) <= BigInt(ceiling.units) * BigInt(prev);
}

/** Largest whole number q with q <= r x prev. */
export function ceilingFloor(prev, ceiling) {
  const n = ceiling.units * prev;
  if (!Number.isSafeInteger(n)) return Number((BigInt(ceiling.units) * BigInt(prev)) / BigInt(SCALE));
  let q = Math.floor(n / SCALE);
  if (q * SCALE > n) q -= 1;
  else if ((q + 1) * SCALE <= n) q += 1;
  return q;
}
