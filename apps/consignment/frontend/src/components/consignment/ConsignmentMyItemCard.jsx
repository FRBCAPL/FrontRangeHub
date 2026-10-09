import React from 'react';
import { Link } from 'react-router-dom';
import { brandModelLabel, itemLabel } from '../../data/consignmentConstants.js';
import { consignmentItemPath } from '../../utils/consignmentPaths.js';
import { formatShortDate } from '../../utils/consignmentDates.js';
import { sellerItemStatus } from '../../utils/consignmentSellerStatus.js';
import ConsignmentFeePayCodes from './ConsignmentFeePayCodes.jsx';

const PUBLIC = ['available', 'sold'];

/** Auction items whose (re)listing fee may still be due: in review, accepted but not started, or ended unsold. */
function feeMayBeDue(item) {
  if (item.sale_method !== 'auction') return false;
  if (item.status === 'pending') return true;
  const a = item.auction;
  return item.status === 'available' && (!a || ['cancelled', 'ended_no_bids', 'defaulted'].includes(a.status));
}

export default function ConsignmentMyItemCard({ item }) {
  const status = sellerItemStatus(item);
  const subtitle = brandModelLabel(item);
  const title = (
    <>
      <span className="cs-mine-num">{itemLabel(item)}</span>
      {item.name}
    </>
  );
  return (
    <li className="cs-mine-card">
      {item.photo_url
        ? <img src={item.photo_url} alt="" loading="lazy" />
        : <div className="cs-mine-ph" aria-hidden="true">🎱</div>}
      <div className="cs-mine-body">
        <span className={`cs-mine-badge tone-${status.tone}`}>{status.label}</span>
        <h3>
          {PUBLIC.includes(item.status) ? <Link to={consignmentItemPath(item.item_number)}>{title}</Link> : title}
        </h3>
        {subtitle ? <p className="cs-meta">{subtitle}</p> : null}
        {status.lines.length ? (
          <ul className="cs-mine-lines">
            {status.lines.map((line) => <li key={line}>{line}</li>)}
          </ul>
        ) : null}
        <p className="cs-meta">Submitted {formatShortDate(item.created_at)}</p>
        {feeMayBeDue(item) ? <ConsignmentFeePayCodes item={item} /> : null}
      </div>
    </li>
  );
}
