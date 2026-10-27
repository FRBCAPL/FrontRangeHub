/**
 * Exact money helpers for Cash Climb V3. Amounts are integer cents or integer dollars; ratios are kept as
 * integer numerator / denominator and rounded with integer arithmetic, never binary floating point.
 */
export const CENTS_PER_DOLLAR = 100;

function bigIntOf(value, label) {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label} must be a safe integer.`);
  return BigInt(value);
}

/** Nearest whole number to num / den, halves rounded up. num >= 0, den > 0. */
export function roundHalfUpRatio(num, den) {
  const n = bigIntOf(num, 'Numerator');
  const d = bigIntOf(den, 'Denominator');
  if (n < 0n || d <= 0n) throw new RangeError('roundHalfUpRatio needs num >= 0 and den > 0.');
  return Number((2n * n + d) / (2n * d));
}

/** Smallest whole number >= num / den. num >= 0, den > 0. */
export function ceilRatio(num, den) {
  const n = bigIntOf(num, 'Numerator');
  const d = bigIntOf(den, 'Denominator');
  if (n < 0n || d <= 0n) throw new RangeError('ceilRatio needs num >= 0 and den > 0.');
  return Number((n + d - 1n) / d);
}

export const isWholeDollarCents = (cents) => Number.isSafeInteger(cents) && cents % CENTS_PER_DOLLAR === 0;

export const centsToDollars = (cents) => {
  if (!isWholeDollarCents(cents)) throw new RangeError('Amount is not a whole number of dollars.');
  return cents / CENTS_PER_DOLLAR;
};

export const formatDollars = (dollars) => `$${Number(dollars).toLocaleString('en-US')}`;
