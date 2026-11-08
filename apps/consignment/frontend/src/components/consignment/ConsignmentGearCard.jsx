import React from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH, categoryLabel } from '../../data/consignmentConstants.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { AVAILABILITY_LABELS, availability, priceRange } from '../../utils/consignmentGearMath.js';

const RIBBON_ICONS = { in_stock: '✨', special: '📦', sold_out: '⏸' };

export const gearProductPath = (slug) => `${CONSIGNMENT_PATH}/new/${encodeURIComponent(slug)}`;

export default function ConsignmentGearCard({ product }) {
  const photo = product.photo_urls?.[0];
  const status = availability(product);
  const { min, max } = priceRange(product);
  const showMsrp = product.msrp && Number(product.msrp) > max;
  return (
    <Link className={`cs-card cs-card-gear cs-gear-${status}`} to={gearProductPath(product.slug)}>
      <div className="cs-card-ribbon">
        <span aria-hidden="true">{RIBBON_ICONS[status]}</span> New · {AVAILABILITY_LABELS[status]}
      </div>
      <div className="cs-card-photo" style={photo ? { '--cs-photo': `url("${photo}")` } : undefined}>
        {photo ? <img src={photo} alt="" loading="lazy" /> : <span aria-hidden="true">🎱</span>}
      </div>
      <div className="cs-card-body">
        <h3>{product.name}</h3>
        <p className="cs-card-sub cs-card-details">
          <span>{product.brand || categoryLabel(product.category)}</span>
        </p>
        <p className="cs-card-price">
          {min !== max ? <span className="cs-card-price-label">From</span> : null}
          <strong>{formatDollars(min)}</strong>
          {showMsrp ? <s className="cs-gear-msrp">{formatDollars(product.msrp)}</s> : null}
          <small>+ tax</small>
        </p>
      </div>
    </Link>
  );
}
