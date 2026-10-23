import React from 'react';
import { Link } from 'react-router-dom';
import { itemLabel, statusLabel } from '../../data/consignmentConstants.js';
import { formatShortDate } from '../../utils/consignmentDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { consignmentItemPath } from '../../utils/consignmentPaths.js';
import { sellerMatches } from '../../utils/consignmentSellerItems.js';

function priceLine(item) {
  if (item.sale_method === 'auction') return `Online auction · reserve ${formatDollars(item.seller_payout)}`;
  const shop = item.selling_price != null ? `shop ${formatDollars(item.selling_price)} · ` : '';
  return `${shop}payout ${formatDollars(item.seller_payout)}`;
}

function paidLine(item) {
  if (item.status !== 'sold') return '';
  const sold = item.sold_at ? `sold ${formatShortDate(item.sold_at)}` : 'sold';
  return item.seller_paid_at ? ` · ${sold}, seller paid ${formatShortDate(item.seller_paid_at)}` : ` · ${sold}, seller NOT paid yet`;
}

/** Quick list of one seller's items under their row on the Sellers tab. */
export default function ConsignmentSellerItems({ itemRows, account }) {
  const mine = (itemRows || []).filter((row) => sellerMatches(row.seller, account));
  if (!mine.length) return <p className="cs-meta">No items yet.</p>;
  return (
    <ul className="cs-bidder-items">
      {mine.map((item) => {
        const name = item.name || 'Item';
        const label = itemLabel(item);
        return (
          <li key={item.id}>
            <span>
              {item.item_number && item.status !== 'pending' ? (
                <Link to={consignmentItemPath(item.item_number)}>{name}</Link>
              ) : name}
              {label ? <span className="cs-meta"> · {label}</span> : null}
              <span className="cs-meta" style={{ display: 'block' }}>
                {statusLabel(item.status)} · {priceLine(item)}{paidLine(item)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
