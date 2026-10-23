/**
 * Match consignment_sellers rows to seller accounts. Newer rows carry user_id; older ones only an email.
 */
const lower = (s) => String(s || '').trim().toLowerCase();

export function sellerMatches(seller, account) {
  if (!seller || !account) return false;
  if (seller.user_id && account.id) return seller.user_id === account.id;
  return Boolean(lower(account.email)) && lower(seller.email) === lower(account.email);
}

/** rows: [{ seller, status, seller_paid_at }] → { pending, listed, sold, owed } for one account. */
export function sellerItemCounts(rows, account) {
  const counts = { pending: 0, listed: 0, sold: 0, owed: 0 };
  for (const row of rows || []) {
    if (!sellerMatches(row.seller, account)) continue;
    if (row.status === 'pending') counts.pending += 1;
    else if (row.status === 'available') counts.listed += 1;
    else if (row.status === 'sold') {
      counts.sold += 1;
      if (!row.seller_paid_at) counts.owed += 1;
    }
  }
  return counts;
}

export function sellerCountsLabel(c) {
  if (!c) return '';
  const parts = [];
  if (c.pending) parts.push(`${c.pending} pending`);
  if (c.listed) parts.push(`${c.listed} listed`);
  if (c.sold) parts.push(`${c.sold} sold`);
  if (c.owed) parts.push(`${c.owed} owed payout`);
  return parts.length ? parts.join(' · ') : 'No items yet';
}
