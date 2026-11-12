/** When a seller's item stops being for sale: auction end, or the case listing's expiry. Null if not running. */
export function itemEndsAt(item) {
  if (item?.status !== 'available') return null;
  const raw = item.sale_method === 'auction'
    ? (item.auction?.status === 'live' ? item.auction.ends_at : null)
    : item.expires_at;
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
}

/** My items order: ending soonest first, then everything else newest first. */
export function sortMyItems(items) {
  const created = (item) => new Date(item?.created_at).getTime() || 0;
  return [...items].sort((a, b) => {
    const ea = itemEndsAt(a);
    const eb = itemEndsAt(b);
    if (ea != null && eb != null) return ea - eb;
    if (ea != null) return -1;
    if (eb != null) return 1;
    return created(b) - created(a);
  });
}
