import { formatDollars } from './consignmentMoney.js';
import { formatShortDate } from './consignmentDates.js';
import { saleSplit, usesShelfCommission } from './consignmentFeePolicy.js';

/**
 * Seller-facing summary of an item from my_consignment_items().
 * Returns { tone, label, lines[] } — tone drives the badge color.
 */
export function sellerItemStatus(item) {
  const a = item.auction;
  const payout = item.seller_payout_paid ?? item.seller_payout;

  if (item.status === 'sold') {
    return {
      tone: 'sold',
      label: 'Sold',
      lines: [
        `Sold ${formatShortDate(item.sold_at)}`,
        `Your payout: ${formatDollars(payout)}`,
        item.seller_paid_at
          ? `Paid to you ${formatShortDate(item.seller_paid_at)}`
          : 'Payout ready — FRPL will contact you to pay out.',
      ],
    };
  }
  if (item.status === 'pending') {
    return {
      tone: 'pending',
      label: 'Waiting for review',
      lines: ['FRPL will review your item and contact you.'],
    };
  }
  if (item.status === 'expired') {
    return {
      tone: 'warn',
      label: 'Expired — pick up',
      lines: [`Please pick it up at Legends by ${formatShortDate(item.pickup_by)}.`],
    };
  }
  if (item.status === 'returned') return { tone: 'muted', label: 'Returned to you', lines: [] };
  if (item.status === 'withdrawn') return { tone: 'muted', label: 'Withdrawn', lines: [] };

  if (item.sale_method === 'auction') return auctionStatus(item, a);

  return {
    tone: 'live',
    label: 'For sale at Legends',
    lines: [
      `Shelf price: ${formatDollars(item.selling_price)}`,
      shelfPayoutLine(item),
      item.expires_at ? `Listed until ${formatShortDate(item.expires_at)}` : null,
    ].filter(Boolean),
  };
}

function shelfPayoutLine(item) {
  if (!usesShelfCommission(item)) return `You receive: ${formatDollars(item.seller_payout)} when it sells`;
  const fee = Number(item.original_fee) || Number(item.consignment_fee) || 0;
  const s = saleSplit(item.selling_price, item.commission_pct, fee);
  const why = s.credit
    ? `FRPL's ${Number(item.commission_pct)}% minus the ${formatDollars(s.credit)} listing fee you paid`
    : `FRPL's ${Number(item.commission_pct)}%`;
  return `You receive: ${formatDollars(s.sellerFromSale)} if it sells at that price (${why})`;
}

function auctionStatus(item, a) {
  const reserve = `Your reserve: ${formatDollars(item.seller_payout)}`;
  if (!a || a.status === 'cancelled') {
    return { tone: 'pending', label: 'Accepted — auction not started', lines: [reserve] };
  }
  if (a.status === 'draft') {
    return { tone: 'pending', label: 'Auction scheduled', lines: [reserve, `Starts ${formatShortDate(a.starts_at)}`] };
  }
  if (a.status === 'live') {
    const bids = Number(a.bid_count || 0);
    return {
      tone: 'live',
      label: 'Auction live',
      lines: [
        bids
          ? `Current bid: ${formatDollars(a.current_bid)} (${bids} bid${bids === 1 ? '' : 's'})`
          : `No bids yet — opening bid ${formatDollars(a.opening_bid)}`,
        reserve,
        `Ends ${new Date(a.ends_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
        a.delivered_at ? null : 'Keep it safe and ready: if it sells, you have 3 days to bring it to Legends.',
      ].filter(Boolean),
    };
  }
  if (a.status === 'awaiting_payment' && 'delivered_at' in a && !a.delivered_at) {
    const due = a.delivery_due_at
      ? new Date(a.delivery_due_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : null;
    return {
      tone: 'warn',
      label: 'Sold — bring it to Legends',
      lines: [
        `Winning bid: ${formatDollars(a.winning_bid)}`,
        due ? `Deliver it to Legends Brews & Cues by ${due}.` : 'Deliver it to Legends Brews & Cues within 3 days.',
        'If it isn’t delivered on time, the sale is cancelled, the listing fee isn’t refunded and you lose selling access.',
      ],
    };
  }
  if (a.status === 'awaiting_payment') {
    return {
      tone: 'live',
      label: 'At Legends — awaiting buyer payment',
      lines: [`Winning bid: ${formatDollars(a.winning_bid)}`, 'Your payout is figured once the buyer pays.'],
    };
  }
  if (a.status === 'defaulted') {
    return { tone: 'warn', label: 'Buyer did not pay', lines: ['FRPL will follow up on next steps.'] };
  }
  if (a.status === 'ended_no_bids') {
    return { tone: 'warn', label: 'Auction ended — no bids', lines: [a.delivered_at ? 'FRPL will contact you about relisting or pickup.' : 'FRPL will contact you about relisting.'] };
  }
  return { tone: 'muted', label: 'Auction closed', lines: [] };
}
