/**
 * Out-of-state shipping (supabase-migrations/consignment-shipping-2026-11.sql).
 * Colorado buyers pick up at Legends; buyers in the lower 48 states and DC can have an item shipped for a flat
 * shipping & handling charge (automatic or fixed per item, see consignmentShipPrice.js). Shipped orders are paid online (Square link) with no Colorado sales tax.
 */

/** Lower 48 + DC, not Colorado. Mirrors consignment_ship_state_ok in the SQL. */
export const SHIP_STATES = [
  ['AL', 'Alabama'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CT', 'Connecticut'],
  ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['ID', 'Idaho'],
  ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'],
  ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'],
  ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
  ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

const SHIP_STATE_CODES = new Set(SHIP_STATES.map(([code]) => code));

export const DEFAULT_COMPLAINT_DAYS = 3;
export const SHIP_CARRIERS = ['USPS', 'UPS', 'FedEx', 'Other'];

const cents = (n) => Math.round(Number(n || 0) * 100) / 100;

export const shipStateAllowed = (code) => SHIP_STATE_CODES.has(String(code || '').trim().toUpperCase());

/** Empty string when the address is OK; otherwise what to fix. Same rules as request_consignment_shipping. */
export function shipAddressError(addr = {}) {
  const v = (k) => String(addr[k] || '').trim();
  if (!v('name') || !v('line1') || !v('city')) return 'Enter the name, street address and city to ship to.';
  const state = v('state').toUpperCase();
  if (state === 'CO') return 'Shipping is only for addresses outside Colorado. Colorado buyers pick up and pay at Legends.';
  if (!shipStateAllowed(state)) return 'Choose a state. We ship to the lower 48 states and DC (not Colorado, Alaska or Hawaii).';
  if (!/^\d{5}(-\d{4})?$/.test(v('zip'))) return 'Enter a 5-digit ZIP code.';
  if (v('name').length > 100 || v('line1').length > 120 || v('line2').length > 120 || v('city').length > 60 || v('phone').length > 30) {
    return 'Part of the address is too long.';
  }
  return '';
}

export const shipTotal = (itemPrice, shipPrice) => cents(cents(itemPrice) + cents(shipPrice));

export const shipmentTotal = (s) => shipTotal(s?.item_price, s?.shipping_price);

const STATUS_LABELS = {
  requested: 'Requested',
  invoiced: 'Payment link sent',
  paid: 'Paid · packing',
  shipped: 'Shipped',
  arrived: 'Delivered',
  cancelled: 'Cancelled',
};

export const shipmentStatusLabel = (status) => STATUS_LABELS[status] || status || '';

export const isLiveShipment = (s) => Boolean(s) && s.status !== 'cancelled';

/** A live Square link can still be paid, so once one is out only FRPL can cancel (it turns the link off first). */
export const canBuyerCancelShipment = (s) => s?.status === 'requested' || (s?.status === 'invoiced' && !s?.square_link_id);

/** Paid online through Square, but the sale isn't recorded in the shop yet (admin taps Record sale). */
export const needsSaleRecorded = (s) => s?.status === 'paid' && s?.item_status != null && s.item_status !== 'sold';

/** When the seller can be paid for a delivered shipment (arrived + complaint window), or null if not delivered. */
export function payoutReadyAt(shipment, complaintDays = DEFAULT_COMPLAINT_DAYS) {
  if (!shipment?.arrived_at) return null;
  const at = new Date(shipment.arrived_at).getTime();
  if (!Number.isFinite(at)) return null;
  return new Date(at + Number(complaintDays || DEFAULT_COMPLAINT_DAYS) * 24 * 60 * 60 * 1000);
}

export const validPaymentLink = (url) => /^https:\/\/\S+$/.test(String(url || '').trim()) && String(url).trim().length <= 500;

/** Carrier tracking page, or null for other carriers. */
export function trackingUrl(carrier, number) {
  const n = encodeURIComponent(String(number || '').trim());
  if (!n) return null;
  const c = String(carrier || '').trim().toLowerCase();
  if (c === 'usps') return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (c === 'ups') return `https://www.ups.com/track?tracknum=${n}`;
  if (c === 'fedex') return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  return null;
}

/** "Austin, TX 78701" style one-liner. */
export function shipCityLine(s) {
  return [[s?.ship_city, s?.ship_state].filter(Boolean).join(', '), s?.ship_zip].filter(Boolean).join(' ');
}
