/**
 * Buyer's "My purchases" (pickup at Legends). Rows come from my_consignment_purchases():
 * kind auction | offer, status awaiting_payment | paid (auction) or accepted | completed (offer).
 */

/** bring = seller still has it · ready = at Legends, pay there · held = offer accepted, pay by the hold · paid = done. */
export function purchaseStep(p) {
  if (p.status === 'paid' || p.status === 'completed') return 'paid';
  if (p.kind === 'offer') return 'held';
  return p.delivered_at ? 'ready' : 'bring';
}

export const PURCHASE_STEP_LABELS = Object.freeze({
  bring: 'On its way to Legends',
  ready: 'Ready at Legends',
  held: 'Held for you',
  paid: 'Paid',
});

const VIA = {
  buy_now: 'Bought with Buy It Now',
  bid: 'Won at auction',
  second_chance: 'Second-chance offer',
  offer: 'Offer accepted',
};

export const boughtVia = (p) => VIA[p.won_via] || 'Purchased';

/** Still to pick up first (newest first), then finished ones. */
export function sortPurchases(rows) {
  const time = (p) => new Date(p.bought_at || 0).getTime();
  const open = rows.filter((p) => purchaseStep(p) !== 'paid').sort((a, b) => time(b) - time(a));
  const done = rows.filter((p) => purchaseStep(p) === 'paid').sort((a, b) => time(b) - time(a));
  return [...open, ...done];
}
