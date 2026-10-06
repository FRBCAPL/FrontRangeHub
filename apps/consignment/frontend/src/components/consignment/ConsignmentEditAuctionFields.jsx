import React from 'react';
import { auctionStatusLabel } from '../../data/consignmentConstants.js';
import { auctionSplit } from '../../utils/consignmentAuctionMath.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

function sellerGets(price, commission) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return null;
  return formatDollars(auctionSplit(n, commission).seller);
}

function AuctionSummary({ auction }) {
  if (!auction) return <p className="cs-static">Not started yet</p>;
  const bids = auction.bid_count
    ? `${formatDollars(auction.current_bid)} · ${auction.bid_count} bid${auction.bid_count === 1 ? '' : 's'}`
    : 'No bids';
  const when = auction.status === 'live' ? `Ends ${formatDateTime(auction.ends_at)}` : `Ended ${formatDateTime(auction.ends_at)}`;
  return (
    <p className="cs-static">
      {auctionStatusLabel(auction.status)} · {bids}
      <br />
      <span className="cs-meta">{when}</span>
    </p>
  );
}

/** Money section of the edit modal for auction items: reserve + Buy It Now instead of retail price. */
export default function ConsignmentEditAuctionFields({ item, form, set, editable, commission }) {
  const auction = item.auction && item.auction.status !== 'cancelled' ? item.auction : null;
  const reserve = auction ? auction.opening_bid : form.seller_payout;
  const buyNow = auction ? auction.buy_now_price : form.requested_buy_now;

  if (editable) {
    const atReserve = sellerGets(form.seller_payout, commission);
    const atBuyNow = sellerGets(form.requested_buy_now, commission);
    return (
      <>
        <div className="cs-row">
          <div className="cs-field">
            <label>Reserve / opening bid ($)</label>
            <input type="number" step="0.01" min="0.01" required value={form.seller_payout} onChange={set('seller_payout')} />
            {atReserve ? <p className="cs-hint">Seller gets {atReserve} if it sells at the reserve.</p> : null}
          </div>
          <div className="cs-field">
            <label>Buy It Now ($)</label>
            <input type="number" step="0.01" min="0" value={form.requested_buy_now} onChange={set('requested_buy_now')} placeholder="Optional" />
            {atBuyNow ? <p className="cs-hint">Seller gets {atBuyNow} at Buy It Now.</p> : null}
          </div>
        </div>
        {auction ? (
          <div className="cs-field">
            <label>Auction</label>
            <AuctionSummary auction={auction} />
          </div>
        ) : null}
        <p className="cs-hint">
          You can change the reserve and Buy It Now until the first bid is placed
          {auction?.status === 'live' ? '. Changes show on the live auction right away.' : '.'}
        </p>
      </>
    );
  }

  return (
    <>
      <div className="cs-row">
        <div className="cs-field">
          <label>Reserve / opening bid</label>
          <p className="cs-static">{formatDollars(reserve)}</p>
        </div>
        <div className="cs-field">
          <label>Buy It Now</label>
          <p className="cs-static">{buyNow != null && buyNow !== '' ? formatDollars(buyNow) : 'None'}</p>
        </div>
      </div>
      <div className="cs-field">
        <label>Auction</label>
        <AuctionSummary auction={auction} />
        <p className="cs-hint">
          {['pending', 'available'].includes(item.status)
            ? 'The reserve and Buy It Now are locked because bidding has started.'
            : 'The reserve and Buy It Now are locked because this item is no longer up for auction.'}
        </p>
      </div>
    </>
  );
}
