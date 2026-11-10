import React from 'react';
import { Link } from 'react-router-dom';
import { itemLabel } from '../../data/consignmentConstants.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { consignmentItemPath } from '../../utils/consignmentPaths.js';
import { shipCityLine, shipmentStatusLabel, shipmentTotal, trackingUrl } from '../../utils/consignmentShipping.js';

function Tracking({ s }) {
  if (!s.tracking_number) return null;
  const url = trackingUrl(s.carrier, s.tracking_number);
  return (
    <p className="cs-meta">
      {s.carrier || 'Tracking'}:{' '}
      {url ? <a href={url} target="_blank" rel="noopener noreferrer">{s.tracking_number}</a> : s.tracking_number}
    </p>
  );
}

/** One shipping request. children = action buttons; extra = admin-only lines (buyer contact, warnings). */
export default function ConsignmentShipmentCard({ shipment: s, children = null, extra = null }) {
  const item = { item_number: s.item_number, category: s.category };
  const name = s.item_name || itemLabel(item) || 'Item';
  const address = [s.ship_name, s.ship_line1, s.ship_line2, shipCityLine(s)].filter(Boolean).join('\n');
  return (
    <article className="cs-gear-order">
      {s.photo
        ? <img className="cs-gear-order-photo" src={s.photo} alt="" loading="lazy" />
        : <div className="cs-gear-order-photo" aria-hidden="true">🚚</div>}
      <div>
        <h3>{s.item_number ? <Link to={consignmentItemPath(s.item_number)}>{name}</Link> : name}</h3>
        {itemLabel(item) ? <p className="cs-meta">{itemLabel(item)}{s.auction_id ? ' · won at auction' : ''}</p> : null}
        <p>
          <span className={`cs-ship-status cs-ship-status-${s.status}`}>{shipmentStatusLabel(s.status)}</span>{' '}
          <strong>{formatDollars(shipmentTotal(s))}</strong>{' '}
          <small>({formatDollars(s.item_price)} + {formatDollars(s.shipping_price)} shipping &amp; handling, no sales tax)</small>
        </p>
        {extra}
        <p className="cs-meta cs-ship-address">{address}{s.ship_phone ? `\n${s.ship_phone}` : ''}</p>
        <Tracking s={s} />
        {s.buyer_note ? <p className="cs-meta">Buyer note: “{s.buyer_note}”</p> : null}
        {s.admin_note ? <p className="cs-meta">FRPL: “{s.admin_note}”</p> : null}
        <p className="cs-meta">
          Requested {formatDateTime(s.created_at)}
          {s.paid_at ? ` · paid ${formatDateTime(s.paid_at)}` : ''}
          {s.shipped_at ? ` · shipped ${formatDateTime(s.shipped_at)}` : ''}
          {s.arrived_at ? ` · delivered ${formatDateTime(s.arrived_at)}` : ''}
        </p>
        {children ? <div className="cs-actions">{children}</div> : null}
      </div>
    </article>
  );
}
