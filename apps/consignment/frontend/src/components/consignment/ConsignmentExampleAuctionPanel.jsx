import React from 'react';
import { formatDollars } from '../../utils/consignmentMoney.js';

/** A frozen sample of the auction panel for example listings. Nothing here talks to the server. */
export default function ConsignmentExampleAuctionPanel({ sample }) {
  const s = sample || {};
  const bids = Number(s.bid_count) || 0;
  const showBuyNow = s.buy_now_price != null && Number(s.buy_now_price) > Number(s.current_bid || 0);
  return (
    <section className="cs-auction-panel cs-example-auction" aria-label="Example online auction">
      <div className="cs-auction-head">
        <span className="cs-auction-badge">Online auction</span>
        <span className="cs-countdown">Sample · ends {s.ends_label || 'Sunday at 9 PM'}</span>
      </div>
      <div className="cs-auction-price">
        <span>{bids ? 'Current bid' : 'Opening bid'}</span>
        <strong>{formatDollars(s.current_bid)}</strong>
        <span className="cs-meta">+ tax</span>
        <span className="cs-meta">{bids} bid{bids === 1 ? '' : 's'}</span>
      </div>
      <div className="cs-example-bid">
        <button type="button" className="cs-btn" disabled>Place a bid</button>
        {showBuyNow ? (
          <button type="button" className="cs-btn-secondary" disabled>Buy It Now {formatDollars(s.buy_now_price)}</button>
        ) : null}
      </div>
      <p className="cs-hint">
        Bidding is turned off on examples. On a real auction, logged-in bidders place bids here, and a bid in the final
        minutes extends the clock.
      </p>
    </section>
  );
}
