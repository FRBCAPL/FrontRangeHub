import React from 'react';
import { auctionStatusLabel, brandModelLabel, itemLabel } from '../../data/consignmentConstants.js';
import { bidderName } from '../../services/consignmentAuctionAdminService.js';
import { auctionSplit } from '../../utils/consignmentAuctionMath.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

function Person({ label, user }) {
  if (!user) return null;
  return (
    <div className="cs-meta">
      {label}: {bidderName(user)}
      {user.phone || user.email ? ` · ${user.phone || user.email}` : ''}
    </div>
  );
}

function BidInfo({ auction }) {
  const { status, bid_count: count } = auction;
  if (['awaiting_payment', 'paid', 'defaulted'].includes(status) && auction.winning_bid != null) {
    const split = auctionSplit(auction.winning_bid, auction.commission_pct);
    return (
      <>
        Won {formatDollars(auction.winning_bid)}
        {auction.won_via === 'buy_now' ? ' (Buy It Now)' : ''}
        {auction.won_via === 'second_chance' ? ' (second chance)' : ''}
        <div className="cs-meta">
          FRPL {Number(auction.commission_pct)}% = {formatDollars(split.commission)} · listing fee credited at payment
        </div>
        <Person label="Winner" user={auction.winner} />
      </>
    );
  }
  return (
    <>
      {count ? `${formatDollars(auction.current_bid)} · ${count} bid${count === 1 ? '' : 's'}` : 'No bids'}
      <Person label="High bidder" user={status === 'live' ? auction.highBidder : null} />
    </>
  );
}

function TimeInfo({ auction }) {
  if (auction.status === 'live') {
    const extended = auction.ends_at !== auction.scheduled_end_at;
    return <div className="cs-meta">Ends {formatDateTime(auction.ends_at)}{extended ? ' (extended)' : ''}</div>;
  }
  if (auction.status === 'awaiting_payment') {
    const overdue = new Date(auction.payment_due_at).getTime() < Date.now();
    return (
      <div className={`cs-meta ${overdue ? 'cs-overdue' : 'cs-due'}`}>
        {overdue ? 'Payment overdue since ' : 'Pay by '}{formatDateTime(auction.payment_due_at)}
      </div>
    );
  }
  return <div className="cs-meta">Ended {formatDateTime(auction.ends_at)}</div>;
}

export default function ConsignmentAuctionAdminRow({ auction, actions }) {
  const item = auction.item || {};
  const itemStillAuction = item.status === 'available' && item.sale_method === 'auction';
  const unsold = ['ended_no_bids', 'defaulted'].includes(auction.status) && itemStillAuction;
  return (
    <tr>
      <td>{itemLabel(item)}</td>
      <td>
        <div className="cs-admin-item">
          <span className="cs-admin-thumb">
            {item.photo_urls?.[0] ? <img src={item.photo_urls[0]} alt="" /> : <span>🎱</span>}
          </span>
          <div>
            <strong>{item.name}</strong>
            <div className="cs-meta">{brandModelLabel(item) || '—'}</div>
            <div className="cs-meta">Seller: {auction.seller?.full_name || '—'}</div>
          </div>
        </div>
      </td>
      <td>
        Reserve {formatDollars(auction.opening_bid)}
        <div className="cs-meta">FRPL {Number(auction.commission_pct)}% of sale</div>
        {auction.buy_now_price != null ? <div className="cs-meta">Buy It Now {formatDollars(auction.buy_now_price)}</div> : null}
      </td>
      <td><BidInfo auction={auction} /></td>
      <td>
        {auctionStatusLabel(auction.status)}
        <TimeInfo auction={auction} />
      </td>
      <td>
        {auction.status === 'live' && !auction.bid_count ? (
          <button type="button" className="cs-btn-secondary" onClick={() => actions.cancel(auction)}>Cancel</button>
        ) : null}
        {auction.status === 'awaiting_payment' ? (
          <>
            <button type="button" className="cs-btn" onClick={() => actions.paid(auction)}>Paid</button>
            <button type="button" className="cs-btn-secondary" onClick={() => actions.unpaid(auction)}>Didn’t pay</button>
          </>
        ) : null}
        {auction.status === 'defaulted' && itemStillAuction && auction.bid_count > 1 ? (
          <button type="button" className="cs-btn" onClick={() => actions.secondChance(auction)}>Offer to next bidder</button>
        ) : null}
        {unsold ? (
          <>
            <button type="button" className="cs-btn" onClick={() => actions.relist(auction)}>Relist</button>
            <button type="button" className="cs-btn-secondary" onClick={() => actions.toFixed(auction)}>Fixed price</button>
            <button type="button" className="cs-btn-secondary" onClick={() => actions.returned(auction)}>Returned</button>
          </>
        ) : null}
      </td>
    </tr>
  );
}
