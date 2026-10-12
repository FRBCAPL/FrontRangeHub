/**
 * Duezy pricing — must match the graduated tiers on the Stripe prices:
 *   1 division $9 · 2–3 divisions $19 · each division after 3 +$4 · yearly = 10× monthly (2 months free).
 */
export const TRIAL_DAYS = 30;
export const TRIAL_DIVISIONS = 2;

const TIERS = { one: 9, upToThree: 19, extra: 4 };

export function monthlyPrice(divisions) {
  const n = Math.max(1, Math.floor(Number(divisions) || 0));
  if (n === 1) return TIERS.one;
  if (n <= 3) return TIERS.upToThree;
  return TIERS.upToThree + (n - 3) * TIERS.extra;
}

export function yearlyPrice(divisions) {
  return monthlyPrice(divisions) * 10;
}

export function priceFor(divisions, interval = 'month') {
  return interval === 'year' ? yearlyPrice(divisions) : monthlyPrice(divisions);
}

/** Extra cost per billing period of going from n to n + 1 divisions. */
export function nextDivisionCost(divisions, interval = 'month') {
  return priceFor((Number(divisions) || 0) + 1, interval) - priceFor(divisions, interval);
}

export const PLAN_ROWS = [
  { label: '1 division', monthly: TIERS.one },
  { label: 'Up to 3 divisions', monthly: TIERS.upToThree },
  { label: 'Each division after 3', monthly: TIERS.extra, plus: true },
];
