import React from 'react';
import { auctionStatusLabel } from '../../data/consignmentConstants.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { needsSaleRecorded } from '../../utils/consignmentShipping.js';

/** Admin → Shipping: what to watch for on one shipment. */
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
  if (s.status === 'arrived') {
    lines.push(s.payout_ready_at && new Date(s.payout_ready_at).getTime() > Date.now()
      ? `Pay the seller after ${formatDateTime(s.payout_ready_at)} (Items → Seller paid).`
      : 'The buyer’s window has ended: pay the seller (Items → Seller paid).');
  }
  return lines.map((line) => <p key={line} className="cs-meta cs-ship-warn">{line}</p>);
}
