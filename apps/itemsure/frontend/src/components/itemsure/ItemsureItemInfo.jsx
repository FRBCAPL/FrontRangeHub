import React, { useEffect, useState } from 'react';
import { listPackages } from '../../services/itemsurePackageService.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';

function Row({ label, children }) {
  return (
    <div className="isu-item-info-row">
      <dt>{label}</dt>
      <dd>{children || <span className="isu-muted">{'\u2013'}</span>}</dd>
    </div>
  );
}

/** The Details tab: the item's catalog facts. Room for vendor and cost later. */
export default function ItemsureItemInfo({ organizationId, item, unitName, showPackaging, onEdit }) {
  const [packages, setPackages] = useState(null);

  useEffect(() => {
    if (!showPackaging) return undefined;
    let alive = true;
    listPackages(organizationId)
      .then((rows) => alive && setPackages(rows.filter((p) => p.item_id === item.id && p.is_active)))
      .catch(() => alive && setPackages([]));
    return () => {
      alive = false;
    };
  }, [organizationId, item.id, showPackaging]);

  return (
    <section className="isu-card isu-item-info" aria-label="Details">
      <dl>
        <Row label="Category">{item.categoryName}</Row>
        <Row label="Counted in">{unitName}</Row>
        <Row label="SKU">{item.sku}</Row>
        <Row label="Barcode">{item.barcode}</Row>
        <Row label="Description">{item.description}</Row>
        {showPackaging ? (
          <Row label="Packaging">
            {packages === null ? <span className="isu-muted">Loading…</span> : packages.length
              ? packages.map((p) => `${p.name} (${displayQuantity(p.size)} ${unitName})`).join(', ')
              : null}
          </Row>
        ) : null}
        <Row label="Status">{item.is_active ? 'Active' : 'Archived'}</Row>
      </dl>
      {onEdit ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onEdit}>Edit details</button>
      ) : null}
    </section>
  );
}
