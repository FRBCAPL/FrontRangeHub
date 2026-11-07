/** Make-an-offer rules, mirrored from consignment-offers-2026-11.sql (the database has the final say). */

import { formatDollars } from './consignmentMoney.js';

/** Lowest allowed offer: half the asking price, rounded up to the dollar. */
export function offerMinimum(asking) {
  const a = Number(asking);
  if (!Number.isFinite(a) || a <= 0) return 0;
  return Math.max(1, Math.ceil(Math.round(a * 100) / 200));
}

function toAmount(value) {
  const n = Number(String(value ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export { toAmount as parseOfferAmount };

/** '' when the buyer's first offer is allowed, else what to fix. */
export function offerError(value, { minimum, asking, saleMethod }) {
  const amount = toAmount(value);
  if (!value || !Number.isFinite(amount) || amount <= 0) return 'Enter your offer in dollars.';
  if (amount < Number(minimum)) return `The lowest offer for this item is ${formatDollars(minimum)}.`;
  if (amount >= Number(asking)) {
    return saleMethod === 'auction'
      ? 'That’s at or above the opening bid. Place a bid instead.'
      : 'That’s the full price. Buy it at Legends instead.';
  }
  return '';
}

/**
 * '' when a counter is allowed. by: 'buyer' (must go below the seller's number) or 'seller'/'admin' (must go above
 * the buyer's number, up to the asking price). Everyone stays at or above the minimum.
 */
export function counterError(value, { by, current, minimum, asking }) {
  const amount = toAmount(value);
  if (!value || !Number.isFinite(amount) || amount <= 0) return 'Enter your counter in dollars.';
  if (amount < Number(minimum)) return `A counter has to be at least ${formatDollars(minimum)}.`;
  if (by === 'buyer') {
    if (amount >= Number(current)) return `Go below ${formatDollars(current)}, or accept it.`;
    return '';
  }
  if (amount <= Number(current)) return `Go above ${formatDollars(current)}, or accept it.`;
  if (asking != null && amount > Number(asking)) return `A counter can’t be above the asking price (${formatDollars(asking)}).`;
  return '';
}

const STATUS = {
  open: 'Waiting',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
  closed: 'Closed',
  completed: 'Sold',
  fell_through: 'Hold ended',
};

/** Short status for a card, from the point of view of `view` (buyer | seller | admin). */
export function offerStatusLabel(offer, view) {
  if (offer?.status !== 'open') return STATUS[offer?.status] || offer?.status || '';
  const waitingOnMe = (view === 'buyer' && offer.turn === 'buyer') || (view !== 'buyer' && offer.turn === 'seller');
  if (waitingOnMe) return view === 'admin' ? 'Waiting on the seller' : 'Your turn';
  return offer.turn === 'buyer' ? 'Waiting on the buyer' : 'Waiting on the seller';
}

/** True when this viewer can Accept / Decline / Counter right now. */
export function canAnswerOffer(offer, view) {
  if (offer?.status !== 'open') return false;
  return view === 'buyer' ? offer.turn === 'buyer' : offer.turn === 'seller';
}

const WHO = { buyer: 'Buyer', seller: 'Seller', admin: 'FRPL', system: '' };
const ACTION = {
  offer: 'offered',
  counter: 'countered',
  accept: 'accepted',
  decline: 'declined',
  withdraw: 'withdrew',
  expire: 'Expired',
  close: 'Closed',
  hold_ended: 'Hold ended',
  sale_ended: 'Sale fell through',
  release: 'ended the hold',
};

/** One line per history step: "Buyer offered $80", "Seller countered $95". */
export function offerHistoryLines(history) {
  return (history || []).map((h) => {
    const who = WHO[h.by] ?? '';
    const act = ACTION[h.action] || h.action;
    const amount = h.amount != null && ['offer', 'counter', 'accept'].includes(h.action) ? ` ${formatDollars(h.amount)}` : '';
    return { key: `${h.at}-${h.action}`, at: h.at, text: `${who ? `${who} ` : ''}${act}${amount}`, note: h.note || '' };
  });
}
