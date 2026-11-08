/** Home page listings: what's for sale, the newest few, and example fill while the shop is small. */

/** Below this many real listings the home page leads with selling (the shop is still filling up). */
export const SELLER_FIRST_UNDER = 12;

/** How many cards the "New in the shop" row shows. */
export const HOME_ROW_SIZE = 4;

const listedAt = (row) => Date.parse(row.intake_at ?? row.created_at) || 0;

/**
 * Real items still for sale, counted like the shop: auction items only while their auction is live
 * (or not started yet). byItem: latest auction per item id.
 */
export function forSaleListings(rows, byItem = {}) {
  return (rows || []).filter((r) => !r.is_example && r.status === 'available'
    && (r.sale_method !== 'auction' || !byItem[r.id] || byItem[r.id].status === 'live'));
}

export function shopCounts(listings) {
  const auctions = listings.filter((r) => r.sale_method === 'auction').length;
  return { case: listings.length - auctions, auctions, total: listings.length };
}

/** Newest real listings first, topped up with examples so the row is never empty. */
export function homeRow(listings, examples = [], size = HOME_ROW_SIZE) {
  const real = [...listings].sort((a, b) => listedAt(b) - listedAt(a)).slice(0, size);
  const fill = (examples || []).slice(0, Math.max(0, size - real.length));
  return [...real, ...fill];
}
