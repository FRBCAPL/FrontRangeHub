/**
 * Sales tax for display: shoppers see what they'll pay at Legends. Prices, offers, bids and payouts stay before tax.
 * Rate comes from consignment_settings.tax_rate (Admin → Settings); 8.25% until that's set.
 */

export const DEFAULT_TAX_RATE = 0.0825;

const cents = (n) => Math.round(Number(n || 0) * 100) / 100;

export function normalizeTaxRate(rate) {
  const r = Number(rate);
  return Number.isFinite(r) && r >= 0 && r < 0.2 ? r : DEFAULT_TAX_RATE;
}

/** Tax on one amount, rounded to the cent like a register. */
export const salesTax = (amount, rate) => cents(Math.round(Number(amount || 0) * normalizeTaxRate(rate) * 100) / 100);

export const withTax = (amount, rate) => cents(Number(amount || 0) + salesTax(amount, rate));

/**
 * Before-tax price whose total with tax is `total` ($300 → $277.14). Tax rounds to the cent, so a few totals
 * can't be hit exactly; then the closest price is used (ties go to the lower total).
 */
export function pretaxFromTotal(total, rate) {
  const target = cents(total);
  if (!(target > 0)) return 0;
  const guess = cents(target / (1 + normalizeTaxRate(rate)));
  let best = guess;
  for (let step = -3; step <= 3; step += 1) {
    const p = cents(guess + step / 100);
    if (p <= 0) continue;
    const off = Math.abs(withTax(p, rate) - target);
    const bestOff = Math.abs(withTax(best, rate) - target);
    if (off < bestOff - 1e-9 || (Math.abs(off - bestOff) < 1e-9 && p < best)) best = p;
  }
  return best;
}

/** 0.0825 → "8.25%" */
export function taxPercent(rate) {
  const pct = Math.round(normalizeTaxRate(rate) * 100000) / 1000;
  return `${pct}%`;
}
