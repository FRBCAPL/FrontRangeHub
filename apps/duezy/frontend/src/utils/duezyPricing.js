/**
 * Duezy pricing — must match the graduated tiers on the Stripe prices (quantity = divisions):
 *   1 division $9 · up to 3 $19 · divisions 4–10 +$4 · 11–20 +$3 · 21–31 +$2 · 32+ $0 (the $99 cap)
 *   yearly = 10× monthly (2 months free), capped at $990.
 */
export const TRIAL_DAYS = 30;
export const TRIAL_DIVISIONS = 2;
export const MONTHLY_CAP = 99;

/** Graduated steps: `flat` is charged once on reaching the step, `each` per division inside it. */
const STEPS = [
  { upTo: 1, flat: 9 },
  { upTo: 3, flat: 10 },
  { upTo: 10, each: 4 },
  { upTo: 20, each: 3 },
  { upTo: Infinity, each: 2 },
];

export function monthlyPrice(divisions) {
  const n = Math.max(1, Math.floor(Number(divisions) || 0));
  let total = 0;
  let from = 0;
  for (const step of STEPS) {
    if (n <= from) break;
    total += step.flat ? step.flat : (Math.min(n, step.upTo) - from) * step.each;
    from = step.upTo;
  }
  return Math.min(total, MONTHLY_CAP);
}

export function yearlyPrice(divisions) {
  return monthlyPrice(divisions) * 10;
}

export function priceFor(divisions, interval = 'month') {
  return interval === 'year' ? yearlyPrice(divisions) : monthlyPrice(divisions);
}

export const capFor = (interval = 'month') => (interval === 'year' ? MONTHLY_CAP * 10 : MONTHLY_CAP);

/** Smallest division count that hits the cap (31 with today's steps). */
export const CAP_DIVISIONS = (() => {
  let n = 1;
  while (monthlyPrice(n) < MONTHLY_CAP) n += 1;
  return n;
})();

export const atCap = (divisions) => Number(divisions) >= CAP_DIVISIONS;

/** Extra cost per billing period of going from n to n + 1 divisions. */
export function nextDivisionCost(divisions, interval = 'month') {
  return priceFor((Number(divisions) || 0) + 1, interval) - priceFor(divisions, interval);
}

export const PLAN_ROWS = [
  { label: '1 division', monthly: 9 },
  { label: 'Up to 3 divisions', monthly: 19 },
  { label: 'Divisions 4–10', monthly: 4, plus: true, each: true },
  { label: 'Divisions 11–20', monthly: 3, plus: true, each: true },
  { label: 'Divisions 21 and up', monthly: 2, plus: true, each: true },
];
