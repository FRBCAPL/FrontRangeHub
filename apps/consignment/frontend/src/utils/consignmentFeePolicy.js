/**
 * Listing fees and the sale split for shelf (fixed-price) and auction items.
 * Mirrored in supabase-migrations/consignment-fee-policy-2026-10.sql — keep in sync.
 *
 * - Listing fee: a % of the price (shelf) or reserve (auction), clamped to a min/max. Paid at drop-off, never refunded.
 * - On a sale FRPL earns the greater of the original listing fee or its commission. The fee is already
 *   paid, so the sale only covers commission − fee (never below 0).
 * - Renewals/relists: the first is free when the price/reserve drops by the required %, otherwise
 *   repeatFeePct of the original fee. Those fees are never credited toward the commission.
 * - Shelf items with no commission_pct were priced with the old markup model and keep that math.
 */

export const DEFAULT_FEE_POLICY = Object.freeze({
  shelfCommissionPct: 20,
  shelfFeePct: 5,
  shelfFeeMin: 15,
  shelfFeeMax: 30,
  auctionCommissionPct: 15,
  auctionFeePct: 5,
  auctionFeeMin: 10,
  auctionFeeMax: 25,
  repeatFeePct: 50,
  freeRepeatDropPct: 10,
});

const SETTING_KEYS = {
  shelfCommissionPct: 'shelf_commission_pct',
  shelfFeePct: 'shelf_fee_pct',
  shelfFeeMin: 'shelf_fee_min',
  shelfFeeMax: 'shelf_fee_max',
  auctionCommissionPct: 'auction_commission_pct',
  auctionFeePct: 'auction_fee_pct',
  auctionFeeMin: 'auction_fee_min',
  auctionFeeMax: 'auction_fee_max',
  repeatFeePct: 'repeat_fee_pct',
  freeRepeatDropPct: 'free_repeat_drop_pct',
};

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Policy from a consignment_settings row, falling back to the defaults for any missing column. */
export function feePolicyFrom(settings) {
  const policy = { ...DEFAULT_FEE_POLICY };
  for (const [key, column] of Object.entries(SETTING_KEYS)) {
    const v = settings?.[column];
    if (v != null && v !== '' && Number.isFinite(Number(v))) policy[key] = Number(v);
  }
  return policy;
}

const isAuction = (method) => method === 'auction';

export function commissionPctFor(method, policy = DEFAULT_FEE_POLICY) {
  return isAuction(method) ? policy.auctionCommissionPct : policy.shelfCommissionPct;
}

/** Listing fee for a shelf price or auction reserve. 0 until a price is entered. */
export function listingFee(price, method, policy = DEFAULT_FEE_POLICY) {
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) return 0;
  const [pct, min, max] = isAuction(method)
    ? [policy.auctionFeePct, policy.auctionFeeMin, policy.auctionFeeMax]
    : [policy.shelfFeePct, policy.shelfFeeMin, policy.shelfFeeMax];
  return round2(Math.min(max, Math.max(min, (p * pct) / 100)));
}

/**
 * Sale split with the original listing fee credited.
 * frplFromSale: what FRPL keeps out of the sale money. sellerFromSale: what the seller is paid at sale.
 * frplTotal: FRPL's total on the item excluding renewal/relist fees. sellerNet: sellerFromSale − credited fee.
 */
export function saleSplit(price, commissionPct, creditedFee = 0) {
  const p = round2(price);
  const fee = Math.max(0, round2(creditedFee));
  const commission = round2((p * Number(commissionPct)) / 100);
  const frplFromSale = round2(Math.max(0, commission - fee));
  const sellerFromSale = round2(p - frplFromSale);
  return {
    price: p,
    commission,
    credit: round2(Math.min(fee, commission)),
    frplFromSale,
    sellerFromSale,
    frplTotal: round2(Math.max(commission, fee)),
    sellerNet: round2(sellerFromSale - fee),
  };
}

/** Lowest sale price where the commission covers the fee. */
export function breakEvenPrice(fee, commissionPct) {
  const pct = Number(commissionPct);
  if (!(pct > 0)) return 0;
  return round2((Number(fee) * 100) / pct);
}

const ORIGINAL_KIND = { auction: 'auction_listing', fixed: 'consignment' };
const REPEAT_KIND = { auction: 'relist', fixed: 'renewal' };

/** The first listing fee paid for this selling method — the only one credited on a sale. */
export function originalListingFee(fees, method) {
  const kind = ORIGINAL_KIND[isAuction(method) ? 'auction' : 'fixed'];
  const first = (fees || [])
    .filter((f) => f.kind === kind)
    .sort((a, b) => new Date(a.paid_at || a.created_at) - new Date(b.paid_at || b.created_at))[0];
  return first ? round2(first.amount) : 0;
}

export function repeatCount(fees, method) {
  const kind = REPEAT_KIND[isAuction(method) ? 'auction' : 'fixed'];
  return (fees || []).filter((f) => f.kind === kind).length;
}

export function priceDropPct(previousPrice, newPrice) {
  const prev = Number(previousPrice);
  const next = Number(newPrice);
  if (!(prev > 0) || !Number.isFinite(next) || next >= prev) return 0;
  return round2(((prev - next) / prev) * 100);
}

/**
 * Renewal (shelf) or relist (auction) fee.
 * Returns { amount, free, dropPct, reason } — reason is a short explanation for the admin.
 */
export function repeatListingFee({ originalFee, previousPrice, newPrice, priorRepeats = 0, policy = DEFAULT_FEE_POLICY }) {
  const dropPct = priceDropPct(previousPrice, newPrice);
  const qualifiesFree = priorRepeats === 0 && dropPct >= policy.freeRepeatDropPct;
  if (qualifiesFree) {
    return { amount: 0, free: true, dropPct, reason: `Free: first time, price lowered ${dropPct}%.` };
  }
  const amount = round2((Number(originalFee) * policy.repeatFeePct) / 100);
  const reason = priorRepeats === 0
    ? `${policy.repeatFeePct}% of the original fee. Lower the price ${policy.freeRepeatDropPct}% or more to make it free.`
    : `${policy.repeatFeePct}% of the original fee (the free one has been used).`;
  return { amount, free: false, dropPct, reason };
}

/** True for shelf items priced with the commission model (vs. the old private markup). */
export function usesShelfCommission(item) {
  return item?.sale_method !== 'auction' && item?.commission_pct != null;
}

/** Shelf sale split for an admin item (needs item.fees). Older markup items pay the fixed Seller Payout. */
export function shelfSaleSplit(item, actualPrice) {
  if (!usesShelfCommission(item)) {
    const price = round2(actualPrice);
    const seller = round2(item?.seller_payout);
    return { price, commission: null, credit: 0, frplFromSale: round2(price - seller), sellerFromSale: seller };
  }
  return saleSplit(actualPrice, item.commission_pct, originalListingFee(item.fees, 'fixed'));
}
