export const CONSIGNMENT_PATH = '/consignment';
/** Set to false when consignment leaves beta to remove the Beta banner. */
export const CONSIGNMENT_BETA = true;
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

export const MESSAGE_TOPICS = [
  { id: 'buying', label: 'Buying or bidding' },
  { id: 'selling', label: 'Selling / my item' },
  { id: 'payment', label: 'Fees or payout' },
  { id: 'account', label: 'Account or seller access' },
  { id: 'problem', label: 'Report a problem' },
  { id: 'other', label: 'Something else' },
];

export function messageTopicLabel(id) {
  return MESSAGE_TOPICS.find((t) => t.id === id)?.label || 'Something else';
}

/** The venue for drop-off, inspection, payment and pickup. Add `address` to show the street address. */
export const LEGENDS = {
  name: 'Legends Brews & Cues',
  city: 'Colorado Springs',
  state: 'CO',
  address: '',
};

export const LEGENDS_PLACE = `${LEGENDS.name} in ${LEGENDS.city}, ${LEGENDS.state}`;

export const LEGENDS_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  [LEGENDS.name, LEGENDS.address, `${LEGENDS.city}, ${LEGENDS.state}`].filter(Boolean).join(', '),
)}`;

/** Where sellers can pay an auction listing fee online. Sales themselves are paid at Legends, never here. */
export const LISTING_FEE_PAY = [
  {
    id: 'cashapp',
    name: 'Cash App',
    handle: '$frusapl',
    href: 'https://cash.app/$frusapl',
    qr: '/usapl/frusapl-cashapp-qr.png',
  },
  {
    id: 'venmo',
    name: 'Venmo',
    handle: '@duesfrusapl',
    href: 'https://venmo.com/u/duesfrusapl',
    qr: '/usapl/frusapl-venmo-qr.png',
  },
];

const CATEGORY_TAGS = {
  cues: 'Cue',
  shafts: 'Shaft',
  break_jump: 'Break/Jump Cue',
  cases: 'Case',
  balls_accessories: 'Accessory',
  other: 'Item',
};

/**
 * Display label like "Cue #0002". The stored item_number (FRPL-0002) stays the ID for URLs,
 * QR tags and lookups; the counter is shared, so the number alone is still unique.
 */
export function itemLabel(item) {
  const num = String(item?.item_number || '').replace(/^FRPL-/i, '');
  if (!num) return '';
  return `${CATEGORY_TAGS[item?.category] || 'Item'} #${num}`;
}

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
