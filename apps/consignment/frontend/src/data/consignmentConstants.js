export const CONSIGNMENT_PATH = '/consignment';
export const CONSIGNMENT_BUCKET = 'consignment-public';
export const DEFAULT_CONSIGNMENT_FEE = 25;
export const CONSIGNMENT_DAYS = 30;
export const PICKUP_GRACE_DAYS = 14;
export const EXPIRING_SOON_DAYS = 7;
export const MAX_PHOTOS = 8;

export const CATEGORIES = [
  { id: 'cues', label: 'Cues' },
  { id: 'shafts', label: 'Shafts' },
  { id: 'break_jump', label: 'Break/Jump Cues' },
  { id: 'cases', label: 'Cases' },
  { id: 'balls_accessories', label: 'Balls/Accessories' },
  { id: 'other', label: 'Other' },
];

export const CONDITIONS = [
  { id: 'new', label: 'New' },
  { id: 'like_new', label: 'Like new' },
  { id: 'excellent', label: 'Excellent' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
  { id: 'project', label: 'Project / needs work' },
];

export const STATUSES = [
  { id: 'pending', label: 'Pending' },
  { id: 'available', label: 'Available' },
  { id: 'sold', label: 'Sold' },
  { id: 'expired', label: 'Expired – Awaiting Pickup' },
  { id: 'returned', label: 'Returned' },
  { id: 'withdrawn', label: 'Withdrawn' },
];

export const FEE_KINDS = [
  { id: 'consignment', label: 'Consignment fee' },
  { id: 'renewal', label: 'Renewal' },
  { id: 'auction_listing', label: 'Auction listing fee' },
  { id: 'relist', label: 'Auction relist fee' },
  { id: 'other', label: 'Other' },
];

export const DEFAULT_AUCTION_LISTING_FEE = 25;

export const AUCTION_STATUSES = [
  { id: 'live', label: 'Live' },
  { id: 'awaiting_payment', label: 'Awaiting payment' },
  { id: 'ended_no_bids', label: 'Ended – no bids' },
  { id: 'defaulted', label: 'Winner did not pay' },
  { id: 'paid', label: 'Paid' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'draft', label: 'Draft' },
];

export function auctionStatusLabel(id) {
  return AUCTION_STATUSES.find((s) => s.id === id)?.label || id || '';
}

export const CONSENT_METHODS = ['In person', 'Text message', 'Email', 'Phone call'];

export function feeKindLabel(id) {
  return FEE_KINDS.find((k) => k.id === id)?.label || id || '';
}

export const PUBLIC_STATUSES = ['available', 'sold'];

export const PAYMENT_METHODS = ['Cash', 'Card', 'Venmo', 'Cash App', 'Check', 'Other'];

export function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label || id || 'Other';
}

export function conditionLabel(id) {
  return CONDITIONS.find((c) => c.id === id)?.label || id || '';
}

export function brandModelLabel(item) {
  return [item?.brand, item?.model].map((v) => (v || '').trim()).filter(Boolean).join(' ');
}

export function statusLabel(id) {
  return STATUSES.find((s) => s.id === id)?.label || id || '';
}
