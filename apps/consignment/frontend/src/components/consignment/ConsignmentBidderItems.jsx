import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { itemLabel } from '../../data/consignmentConstants.js';
import { loadBidderAuctions } from '../../services/consignmentBidderAccountsService.js';
import { bidderOutcome } from '../../utils/consignmentBidderOutcome.js';
import { formatShortDate } from '../../utils/consignmentDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { consignmentItemPath } from '../../utils/consignmentPaths.js';

/** The auctions one bidder has bid on, with where they stand on each. */
export default function ConsignmentBidderItems({ userId }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    loadBidderAuctions(userId)
      .then((data) => { if (live) setRows(data); })
      .catch((err) => { if (live) setError(err.message); });
    return () => { live = false; };
  }, [userId]);

  if (error) return <p className="cs-error">{error}</p>;
  if (!rows) return <p className="cs-meta">Loading items…</p>;
  if (!rows.length) return <p className="cs-meta">No bids found.</p>;
  return (
    <ul className="cs-bidder-items">
      {rows.map((r) => {
        const name = r.item?.name || 'Item';
        const label = itemLabel(r.item);
        return (
          <li key={r.auction.id}>
            <span>
              {r.item?.item_number ? (
                <Link to={consignmentItemPath(r.item.item_number)}>{name}</Link>
              ) : name}
              {label ? <span className="cs-meta"> · {label}</span> : null}
              <span className="cs-meta" style={{ display: 'block' }}>
                {bidderOutcome(r.auction, userId)}
                {' · '}their top bid {formatDollars(r.topBid)}{r.boughtNow ? ' (Buy It Now)' : ''}
                {r.auction.status === 'live' ? ` · current ${formatDollars(r.auction.current_bid)}` : ''}
                {' · '}{r.bidCount} bid{r.bidCount === 1 ? '' : 's'}, last {formatShortDate(r.lastBidAt)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
