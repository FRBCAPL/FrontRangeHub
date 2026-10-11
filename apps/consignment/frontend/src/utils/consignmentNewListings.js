/** How long a listing counts as "new" for the homepage badge. */
export const NEW_LISTING_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

function isRecent(value, cutoffMs) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms >= cutoffMs;
}

/**
 * Counts listings that went up within the last NEW_LISTING_DAYS.
 * items: consignment_catalog rows. Case items count from intake_at (accepted), else created_at.
 * auctions: consignment_auction_board rows; a live auction counts from starts_at.
 */
export function countNewListings({ items = [], auctions = [], now = Date.now(), days = NEW_LISTING_DAYS }) {
  const cutoff = now - days * DAY_MS;
  const shelf = items.filter((i) => i.status === 'available' && !i.is_example && i.sale_method !== 'auction'
    && isRecent(i.intake_at ?? i.created_at, cutoff)).length;
  const auction = auctions.filter((a) => a.status === 'live' && isRecent(a.starts_at, cutoff)).length;
  return { shelf, auction };
}

/** "New auction", "2 new auctions", "New item", "3 new items", "3 new listings", or '' when nothing is new. */
export function newListingsLabel({ shelf, auction }) {
  const total = shelf + auction;
  if (!total) return '';
  if (shelf && auction) return `${total} new listings`;
  const noun = auction ? 'auction' : 'item';
  return total === 1 ? `New ${noun}` : `${total} new ${noun}s`;
}
