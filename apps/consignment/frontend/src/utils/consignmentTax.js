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

/** 0.0825 → "8.25%" */
export function taxPercent(rate) {
  const pct = Math.round(normalizeTaxRate(rate) * 100000) / 1000;
  return `${pct}%`;
}
