import { brandModelLabel, categoryLabel, itemLabel } from '../data/consignmentConstants.js';

/** Seller's My items filter buttons, in display order. */
export const MY_ITEM_FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'case', label: 'In the case', test: (i) => i.status === 'available' && i.sale_method !== 'auction' },
  { id: 'auction', label: 'Auctions', test: (i) => i.status === 'available' && i.sale_method === 'auction' },
  { id: 'pending', label: 'In review', test: (i) => i.status === 'pending' },
  { id: 'sold', label: 'Sold', test: (i) => i.status === 'sold' },
  { id: 'ended', label: 'Expired / returned', test: (i) => ['expired', 'returned', 'withdrawn'].includes(i.status) },
];

/** Case-insensitive match on name, brand/model, item number ("Cue #0010", "FRPL-0010", "10") and category. */
export function myItemMatches(item, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return [item.name, brandModelLabel(item), item.item_number, itemLabel(item), categoryLabel(item.category)]
    .some((v) => String(v || '').toLowerCase().includes(q));
}

export function filterMyItems(items, filterId, query) {
  const filter = MY_ITEM_FILTERS.find((f) => f.id === filterId) || MY_ITEM_FILTERS[0];
  return items.filter((item) => filter.test(item) && myItemMatches(item, query));
}

/** { all: 5, case: 2, ... } for the items matching the search. */
export function myItemFilterCounts(items, query) {
  const matching = items.filter((item) => myItemMatches(item, query));
  return Object.fromEntries(MY_ITEM_FILTERS.map((f) => [f.id, matching.filter(f.test).length]));
}
