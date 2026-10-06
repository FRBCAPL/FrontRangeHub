/**
 * Auction rules (mirrored in supabase-migrations/consignment-auctions-2026-10.sql — keep in sync):
 * - Increments: $5 below $500, $10 at $500+.
 * - The seller sets the reserve; it is the opening bid. FRPL keeps the commission % of the final price.
 * - Buy It Now disappears once the current bid reaches it.
 * - Soft close: a bid inside the final N minutes moves the end to N minutes after that bid.
 */

export const DEFAULT_COMMISSION_PCT = 15;
export const DEFAULT_SOFT_CLOSE_MINUTES = 2;
export const INCREMENT_BREAK = 500;

const round2 = (n) => Math.round(Number(n) * 100) / 100;

export function bidIncrement(amount) {
  return Number(amount) < INCREMENT_BREAK ? 5 : 10;
}

export function roundUpToIncrement(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const inc = bidIncrement(n);
  // Round off float noise (e.g. 85 / 0.85 = 100.00000000000001) before ceiling.
  const steps = Math.ceil(Math.round((n / inc) * 1e6) / 1e6);
  return steps * inc;
}

/** The seller's reserve is the opening bid — no markup. */
export function openingBid(reserve) {
  const n = Number(reserve);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return round2(n);
}

export function auctionSplit(finalPrice, commissionPct = DEFAULT_COMMISSION_PCT) {
  const price = round2(finalPrice);
  const commission = round2((price * Number(commissionPct)) / 100);
  return { price, commission, seller: round2(price - commission) };
}

export function minNextBid({ openingBid: opening, currentBid, bidCount }) {
  if (!bidCount) return Number(opening);
  return round2(Number(currentBid) + bidIncrement(currentBid));
}

export function buyNowAvailable({ buyNowPrice, currentBid, bidCount }) {
  if (buyNowPrice == null || buyNowPrice === '') return false;
  if (!bidCount) return true;
  return Number(currentBid) < Number(buyNowPrice);
}

/** Returns the (possibly extended) end time after a bid placed at `bidAt`. */
export function softCloseEnd(endsAt, bidAt, minutes = DEFAULT_SOFT_CLOSE_MINUTES) {
  const end = new Date(endsAt).getTime();
  const at = new Date(bidAt).getTime();
  const windowMs = minutes * 60 * 1000;
  return new Date(end - at < windowMs ? at + windowMs : end);
}

/** Client-side pre-check; the database function is the real authority. Returns an error message or null. */
export function bidError(amount, auction) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 'Enter a bid amount.';
  const min = minNextBid(auction);
  if (n < min) return `Minimum bid is $${min.toLocaleString('en-US')}.`;
  return null;
}
