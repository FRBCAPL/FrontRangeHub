/** Admin → Items status tabs. Each id is a status loadAdminItems / loadAdminItemCounts understand. */
import { EXPIRING_SOON_DAYS } from '../data/consignmentConstants.js';

export const ITEM_STATUS_TABS = [
  { id: 'pending', label: 'Needs approval', hint: 'New listings waiting for you to approve' },
  { id: 'available', label: 'Listed', hint: 'For sale in the case or in an online auction' },
  { id: 'expiring', label: 'Expiring soon', hint: `Listed items ending within ${EXPIRING_SOON_DAYS} days` },
  { id: 'seller_unpaid', label: 'Owed to seller', hint: 'Sold, but the seller hasn’t been paid yet' },
  { id: 'expired', label: 'Awaiting pickup', hint: 'Listing ended; the seller needs to pick it up' },
  { id: 'sold', label: 'Sold', hint: 'All sold items' },
  { id: 'returned', label: 'Returned', hint: 'Picked up by the seller' },
  { id: 'withdrawn', label: 'Withdrawn', hint: 'Rejected or taken out of the shop' },
  { id: 'all', label: 'All', hint: 'Every item' },
];

/** Tabs that need the admin's attention; their counts are highlighted when above zero. */
export const ACTION_TABS = new Set(['pending', 'expiring', 'seller_unpaid', 'expired']);

export const ITEM_TAB_IDS = ITEM_STATUS_TABS.map((t) => t.id);

/** "Needs approval" for a tab id; falls back to the raw status for links from older pages. */
export const itemTabLabel = (id) => ITEM_STATUS_TABS.find((t) => t.id === id)?.label || id;
