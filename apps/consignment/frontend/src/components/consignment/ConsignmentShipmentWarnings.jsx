import React from 'react';
import { auctionStatusLabel } from '../../data/consignmentConstants.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { needsSaleRecorded } from '../../utils/consignmentShipping.js';
import { adminShipFlag, problemOpen } from '../../utils/consignmentShipAcceptance.js';

function payoutLine(s) {
  if (problemOpen(s)) return 'The seller payout is on hold. Contact the buyer, then tap a Resolve button below.';
  if (s.problem_resolution === 'refunded') return 'The buyer was refunded, so the seller isn’t paid for this item. Sort out the return with the seller.';
  if (s.buyer_accepted_at || s.problem_resolution === 'pay_seller') return 'Pay the seller now (Items → Seller paid).';
  return s.payout_ready_at && new Date(s.payout_ready_at).getTime() > Date.now()
    ? `Pay the seller after ${formatDateTime(s.payout_ready_at)}, or sooner if the buyer confirms it’s as described (Items → Seller paid).`
    : 'The buyer’s window has ended: pay the seller (Items → Seller paid).';
}

/** Admin → Shipping: what to watch for on one shipment, plus the buyer's confirmation or problem report. */
export default function ConsignmentShipmentWarnings({ s }) {
  const lines = [];
  if (s.auction_id && !['awaiting_payment', 'paid'].includes(s.auction_status)) {
    lines.push(`The auction is now “${auctionStatusLabel(s.auction_status)}”. Cancel this request unless that’s expected.`);
  } else if (s.auction_id && s.auction_status === 'awaiting_payment' && !s.delivered_at) {
    lines.push('Waiting for the seller to bring it to Legends. Send the payment link once it’s there.');
  }
  if (!s.auction_id && ['requested', 'invoiced'].includes(s.status)) {
    if (s.item_status === 'sold') lines.push('The item is already marked sold. If someone else bought it at Legends, cancel this request.');
    else if (s.item_status !== 'available') lines.push(`The item is no longer for sale (${s.item_status}). Cancel this request.`);
    else lines.push('Take it out of the case and keep it behind the bar until this is paid or cancelled.');
  }
  if (s.status === 'invoiced' && s.square_link_id) {
    lines.push('Square link sent. It’s marked paid automatically when the buyer pays (or tap Check payment).');
  }
  if (needsSaleRecorded(s)) {
    const fee = s.square_fee != null ? ` Square fee ${formatDollars(s.square_fee)}.` : '';
    lines.push(`Paid online ${formatDollars(s.paid_amount ?? Number(s.item_price) + Number(s.shipping_price))}.${fee} Tap Record sale, then ship it.`);
  }
  if (s.status === 'arrived') lines.push(payoutLine(s));
  const flag = adminShipFlag(s);
  return (
    <>
      {flag ? <p><span className={`cs-ship-flag cs-ship-flag-${flag.tone}`}>{flag.text}</span></p> : null}
      {s.problem_note ? <p className="cs-meta">Buyer’s report: “{s.problem_note}”</p> : null}
      {lines.map((line) => <p key={line} className="cs-meta cs-ship-warn">{line}</p>)}
    </>
  );
}
