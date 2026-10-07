import React, { useState } from 'react';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

const COLLAPSED = 5;

export default function ConsignmentBidHistory({ bids }) {
  const [all, setAll] = useState(false);
  if (!bids?.length) return null;
  const shown = all ? bids : bids.slice(0, COLLAPSED);
  return (
    <div className="cs-bid-history">
      <h3>Bid history ({bids.length})</h3>
      <ul>
        {shown.map((b) => (
          <li key={`${b.created_at}-${b.amount}`} className={b.is_mine ? 'is-mine' : undefined}>
            <span>{b.is_mine ? 'You' : b.bidder_label}</span>
            <strong>{formatDollars(b.amount)}{b.is_buy_now ? ' · Buy It Now' : ''}</strong>
            <span className="cs-meta">{formatDateTime(b.created_at)}</span>
          </li>
        ))}
      </ul>
      {bids.length > COLLAPSED ? (
        <button type="button" className="cs-link-btn" onClick={() => setAll((v) => !v)}>
          {all ? 'Show fewer' : `Show all ${bids.length}`}
        </button>
      ) : null}
    </div>
  );
}
