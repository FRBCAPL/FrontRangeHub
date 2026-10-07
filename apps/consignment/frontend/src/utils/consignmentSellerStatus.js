import { formatDollars } from './consignmentMoney.js';
import { formatShortDate } from './consignmentDates.js';

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
      `You receive: ${formatDollars(item.seller_payout)} when it sells`,
      item.expires_at ? `Listed until ${formatShortDate(item.expires_at)}` : null,
    ].filter(Boolean),
  };
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
      ],
    };
  }
  if (a.status === 'awaiting_payment') {
    return {
      tone: 'live',
      label: 'Won — awaiting buyer payment',
      lines: [`Winning bid: ${formatDollars(a.winning_bid)}`, 'Your payout is figured once the buyer pays.'],
    };
  }
  if (a.status === 'defaulted') {
    return { tone: 'warn', label: 'Buyer did not pay', lines: ['FRPL will follow up on next steps.'] };
  }
  if (a.status === 'ended_no_bids') {
    return { tone: 'warn', label: 'Auction ended — no bids', lines: ['FRPL will contact you about relisting or pickup.'] };
  }
  return { tone: 'muted', label: 'Auction closed', lines: [] };
}
