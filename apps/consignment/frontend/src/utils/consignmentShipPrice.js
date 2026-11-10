/**
 * Automatic shipping & handling price. Mirrors consignment_ship_price in
 * supabase-migrations/consignment-shipping-auto-price-2026-11.sql — the database works out the real charge
 * when the buyer asks for shipping; this shows the same number on the page first.
 *
 * price = base for the category + insurance per started $100 above the included coverage, rounded up to the next $5.
 * A fixed price set on the item wins.
 */

export const SHIP_CATEGORIES = [
  ['cues', 'Cues'],
  ['break_jump', 'Break / jump cues'],
  ['shafts', 'Shafts'],
  ['cases', 'Cases'],
  ['balls_accessories', 'Balls & accessories'],
  ['other', 'Other'],
];

export const DEFAULT_SHIP_RULES = Object.freeze({
  baseRates: Object.freeze({ cues: 40, break_jump: 40, shafts: 30, cases: 45, balls_accessories: 25, other: 30 }),
  insurancePer100: 1.5,
  includedCoverage: 100,
});

const num = (v, fallback) => {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? n : fallback;
};

/** Rules from consignment_shipping_public() (or settings), falling back to the defaults for anything missing. */
export function shipRulesFrom(data = {}) {
  const raw = data?.base_rates && typeof data.base_rates === 'object' ? data.base_rates : {};
  const baseRates = {};
  for (const [key] of SHIP_CATEGORIES) baseRates[key] = num(raw[key], DEFAULT_SHIP_RULES.baseRates[key]);
  return {
    baseRates,
    insurancePer100: num(data?.insurance_per_100, DEFAULT_SHIP_RULES.insurancePer100),
    includedCoverage: num(data?.included_coverage, DEFAULT_SHIP_RULES.includedCoverage),
  };
}

/** Rules from a consignment_settings row (admin). */
export const shipRulesFromSettings = (s) => shipRulesFrom({
  base_rates: s?.shipping_base_rates,
  insurance_per_100: s?.shipping_insurance_per_100,
  included_coverage: s?.shipping_included_coverage,
});

export function shipBase(category, rules = DEFAULT_SHIP_RULES) {
  const rates = rules?.baseRates || DEFAULT_SHIP_RULES.baseRates;
  return num(rates[category], num(rates.other, 30));
}

/** Shipping for an item worth `value`. fixed = the item's own price (null/undefined = automatic). */
export function shipPriceFor({ category, value, fixed = null } = {}, rules = DEFAULT_SHIP_RULES) {
  if (fixed != null && fixed !== '') return Math.round(Number(fixed) * 100) / 100;
  const over = Math.max(0, num(value, 0) - num(rules?.includedCoverage, 100));
  const blocks = Math.ceil(Math.round(over * 100) / 10000);
  const cents = Math.round((shipBase(category, rules) + blocks * num(rules?.insurancePer100, 1.5)) * 100);
  return Math.ceil(cents / 500) * 5;
}

/**
 * What the item page shows. ship = { fixed } when the item ships (fixed null = automatic), or null.
 * estimate is true for a live auction on automatic pricing: insurance follows the final price.
 */
export function itemShipQuote(item, auction, ship, rules = DEFAULT_SHIP_RULES) {
  if (!item || !ship) return null;
  let value = Number(item.selling_price) || 0;
  let estimate = false;
  if (item.sale_method === 'auction') {
    if (auction?.status === 'awaiting_payment' || auction?.status === 'paid') {
      value = Number(auction.winning_bid) || 0;
    } else {
      value = Number(auction?.bid_count ? auction.current_bid : auction?.opening_bid) || 0;
      estimate = ship.fixed == null;
    }
  }
  return { price: shipPriceFor({ category: item.category, value, fixed: ship.fixed }, rules), estimate };
}
