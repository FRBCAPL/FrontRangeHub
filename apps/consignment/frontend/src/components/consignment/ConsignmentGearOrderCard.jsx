import React from 'react';
import { Link } from 'react-router-dom';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { gearStatusLabel, orderTotal } from '../../utils/consignmentGearMath.js';
import { gearProductPath } from './ConsignmentGearCard.jsx';

/** One reservation / special order. children = action buttons (buyer Cancel, or admin actions). */
export default function ConsignmentGearOrderCard({ order, children, buyer = null }) {
  const name = order.qty > 1 ? `${order.qty} × ${order.product_name}` : order.product_name;
  const waiting = ['held', 'ready'].includes(order.status) && order.hold_until;
  return (
    <article className="cs-gear-order">
      {order.photo
        ? <img className="cs-gear-order-photo" src={order.photo} alt="" loading="lazy" />
        : <div className="cs-gear-order-photo" aria-hidden="true">🎱</div>}
      <div>
        <h3>{order.slug ? <Link to={gearProductPath(order.slug)}>{name}</Link> : name}</h3>
        {order.option_label ? <p className="cs-meta">{order.option_label}</p> : null}
        <p>
          <span className={`cs-gear-status cs-gear-status-${order.status}`}>{gearStatusLabel(order.status)}</span>{' '}
          <strong>{formatDollars(orderTotal(order))}</strong> <small>+ tax</small>
          {order.kind === 'special' ? <span className="cs-meta"> · special order</span> : null}
        </p>
        {waiting ? <p className="cs-meta">Pick up and pay by {formatDateTime(order.hold_until)}</p> : null}
        {order.status === 'requested' || order.status === 'ordered'
          ? <p className="cs-meta">{order.lead_time ? `Usually ${order.lead_time}. ` : ''}{buyer ? '' : 'We’ll email you when it arrives.'}</p>
          : null}
        {buyer}
        {order.note ? <p className="cs-meta">Note: “{order.note}”</p> : null}
        {order.admin_note ? <p className="cs-meta">FRPL: “{order.admin_note}”</p> : null}
        <p className="cs-meta">Placed {formatDateTime(order.created_at)}</p>
        {children ? <div className="cs-actions">{children}</div> : null}
      </div>
    </article>
  );
}
