/**
 * What the Admin Inbox shows, grouped by app. Keys match admin_attention_summary()
 * in supabase-migrations/admin-attention-summary-2026-10.sql.
 */
export const ATTENTION_GROUPS = [
  {
    id: 'accounts',
    app: 'Accounts & Ladder',
    icon: '🪜',
    items: [
      { key: 'ladder_applications', label: 'Ladder applications to approve', to: '/admin' },
      { key: 'account_requests', label: 'New accounts to approve (buyers, non-ladder)', to: '/consignment/admin?tab=auctions' },
      { key: 'ladder_scheduling', label: 'Match scheduling requests', to: '/ladder/admin' },
      { key: 'ladder_forfeits', label: 'Forfeit requests', to: '/ladder/admin' },
      { key: 'payments_pending', label: 'Payments to verify', to: '/admin' },
    ],
  },
  {
    id: 'consignment',
    app: 'Consignment & Auctions',
    icon: '🏷️',
    items: [
      { key: 'consignment_seller_requests', label: 'Seller access requests', to: '/consignment/admin?sellers=1' },
      { key: 'consignment_pending', label: 'New items submitted for review', to: '/consignment/admin?status=pending' },
      { key: 'consignment_expired', label: 'Expired items (renew or return)', to: '/consignment/admin?status=expired' },
      { key: 'consignment_seller_unpaid', label: 'Sold items: seller not paid yet', to: '/consignment/admin?status=seller_unpaid' },
      { key: 'auction_no_bids', label: 'Auctions ended with no bids (relist, switch or return)', to: '/consignment/admin?tab=auctions&status=ended_no_bids' },
      { key: 'auction_overdue', label: 'Auction winners overdue on payment', to: '/consignment/admin?tab=auctions&status=awaiting_payment' },
    ],
  },
  {
    id: 'usapl',
    app: 'USA Pool League',
    icon: '🎱',
    items: [
      { key: 'usapl_claims', label: 'Captain claims', to: '/usapl/admin' },
      { key: 'usapl_signups', label: 'New player sign-ups', to: '/usapl/admin' },
      { key: 'usapl_rosters', label: 'New roster submissions', to: '/usapl/admin' },
    ],
  },
  {
    id: 'tournaments',
    app: 'Tournaments',
    icon: '🏆',
    items: [
      { key: 'cash_climb_results', label: 'Cash Climb results to confirm', to: '/tournament-bracket' },
      { key: 'elim_results', label: 'Elimination results to confirm', to: '/tournament-bracket' },
    ],
  },
  {
    id: 'duezy',
    app: 'Duezy',
    icon: '💵',
    items: [
      { key: 'duezy_operators', label: 'League operator accounts to approve', to: '/dues-tracker' },
    ],
  },
  {
    id: 'estate',
    app: 'Estate Vault',
    icon: '🏛️',
    items: [
      { key: 'estate_identity', label: 'PR identity transfer requests to review', to: '/estateit/super?tab=identity' },
      { key: 'estate_messages', label: 'Unread heir messages (your estates)', to: '/estateit/owner' },
    ],
  },
];

/** Groups with only the items that have something waiting. */
export function activeGroups(counts) {
  return ATTENTION_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => Number(counts?.[it.key]) > 0) }))
    .filter((g) => g.items.length);
}

export function totalCount(counts) {
  return ATTENTION_GROUPS.reduce(
    (sum, g) => sum + g.items.reduce((s, it) => s + (Number(counts?.[it.key]) || 0), 0),
    0,
  );
}
