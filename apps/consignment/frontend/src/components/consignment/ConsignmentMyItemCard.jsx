import React from 'react';
import { Link } from 'react-router-dom';
import { brandModelLabel, itemLabel } from '../../data/consignmentConstants.js';
import { consignmentItemPath } from '../../utils/consignmentPaths.js';
import { formatShortDate } from '../../utils/consignmentDates.js';
import { sellerItemStatus } from '../../utils/consignmentSellerStatus.js';
import ConsignmentFeePayCodes from './ConsignmentFeePayCodes.jsx';
import ConsignmentNextStepPanel from './ConsignmentNextStepPanel.jsx';
import ConsignmentMyListingDetails from './ConsignmentMyListingDetails.jsx';

const PUBLIC = ['available', 'sold'];
const UNSOLD = ['ended_no_bids', 'defaulted'];

/** Auction item waiting on the seller's pick after it didn't sell. */
function needsNextStep(item) {
  return 'relist_policy' in item
    && item.sale_method === 'auction' && item.status === 'available' && UNSOLD.includes(item.auction?.status);
}

/** Auction items whose listing fee may still be due: in review, or accepted but not started. */
function feeMayBeDue(item) {
  if (item.sale_method !== 'auction') return false;
  if (item.status === 'pending') return true;
  const a = item.auction;
  return item.status === 'available' && (!a || a.status === 'cancelled');
}

export default function ConsignmentMyItemCard({ item, settings, onChanged }) {
  const status = sellerItemStatus(item, settings);
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
        <ConsignmentMyListingDetails item={item} onSaved={onChanged} />
        {feeMayBeDue(item) ? <ConsignmentFeePayCodes item={item} /> : null}
        {needsNextStep(item) ? <ConsignmentNextStepPanel item={item} settings={settings} onDone={onChanged} /> : null}
      </div>
    </li>
  );
}
