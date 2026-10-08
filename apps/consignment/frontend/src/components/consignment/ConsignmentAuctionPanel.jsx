import React, { useEffect, useState } from 'react';
import useConsignmentAuction from '../../hooks/useConsignmentAuction.js';
import { loadPublicSettings } from '../../services/consignmentSellerAccessService.js';
import { addDays } from '../../utils/consignmentDates.js';
import { formatCountdown, formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import ConsignmentBidForm from './ConsignmentBidForm.jsx';
import ConsignmentBidHistory from './ConsignmentBidHistory.jsx';

const DEFAULT_PAY_DAYS = 7;

function EndedMessage({ auction, iWon, payDays }) {
  if (auction.status === 'ended_no_bids') {
    return <p className="cs-lede">This auction ended with no bids.</p>;
  }
  const sold = `Sold for ${formatDollars(auction.winning_bid)} + tax${auction.won_via === 'buy_now' ? ' (Buy It Now)' : ''}.`;
  if (iWon && auction.status === 'awaiting_payment') {
    const due = addDays(auction.won_at, payDays);
    return (
      <div className="cs-bid-won">
        <strong>You won! {sold}</strong>
        <p>Pay and pick up at Legends Brews &amp; Cues by {formatDateTime(due)}. Sales tax is added at the register.</p>
      </div>
    );
  }
  return <p className="cs-lede">Auction ended. {sold}</p>;
}

export default function ConsignmentAuctionPanel({ itemId }) {
  const { auction, history, userId, myTopBid, isHighBidder, remaining, loading, error, refresh } = useConsignmentAuction(itemId);
  const [payDays, setPayDays] = useState(DEFAULT_PAY_DAYS);

  useEffect(() => {
    loadPublicSettings()
      .then((row) => { if (row?.auction_payment_days) setPayDays(Number(row.auction_payment_days)); })
      .catch(() => {});
  }, []);

  if (loading) return <div className="cs-auction-panel"><p className="cs-lede">Loading auction…</p></div>;
  if (error) return <div className="cs-auction-panel"><p className="cs-error">{error}</p></div>;
  if (!auction) return <div className="cs-auction-panel"><p className="cs-lede">Bidding isn’t open on this item right now. Ask at Legends for details.</p></div>;

  const live = auction.status === 'live';
  const iWon = Boolean(myTopBid && auction.winning_bid != null && Number(myTopBid.amount) === Number(auction.winning_bid));
  const closing = live && remaining < 5 * 60 * 1000;

  return (
    <section className="cs-auction-panel" aria-label="Online auction">
      <div className="cs-auction-head">
        <span className="cs-auction-badge">Online auction</span>
        {live ? (
          <span className={`cs-countdown${closing ? ' closing' : ''}`} aria-live="polite">
            {remaining > 0 ? `Ends in ${formatCountdown(remaining)}` : 'Closing…'}
          </span>
        ) : null}
      </div>

      {live ? (
        <>
          <div className="cs-auction-price">
            <span>{auction.bid_count ? 'Current bid' : 'Opening bid'}</span>
            <strong>{formatDollars(auction.bid_count ? auction.current_bid : auction.opening_bid)}</strong>
            <span className="cs-meta">+ tax</span>
            <span className="cs-meta">
              {auction.bid_count} bid{auction.bid_count === 1 ? '' : 's'} · ends {formatDateTime(auction.ends_at)}
            </span>
          </div>
          <ConsignmentBidForm
            auction={auction}
            userId={userId}
            isHighBidder={isHighBidder}
            payDays={payDays}
            onBid={refresh}
          />
          <p className="cs-hint">
            Bids are binding. A bid in the final minutes extends the clock. The winner pays and picks up at Legends
            within {payDays} days; sales tax is added at the register.
          </p>
        </>
      ) : (
        <EndedMessage auction={auction} iWon={iWon} payDays={payDays} />
      )}

      <ConsignmentBidHistory bids={history} />
    </section>
  );
}
