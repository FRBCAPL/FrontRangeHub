import React, { useEffect, useState } from 'react';
import { listPackages } from '../../services/itemsurePackageService.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { contentLabel } from '../../utils/itemsureItemContent.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import useSuppliers from '../../hooks/useSuppliers.js';

function Row({ label, children }) {
  return (
    <div className="isu-item-info-row">
      <dt>{label}</dt>
      <dd>{children || <span className="isu-muted">{'\u2013'}</span>}</dd>
    </div>
  );
}

/** The Details tab: the item's catalog facts, including who it is bought from. */
export default function ItemsureItemInfo({ organizationId, item, unitName, showPackaging, variantLabel, onEdit }) {
  const [packages, setPackages] = useState(null);
  const suppliers = useSuppliers(organizationId);
  const supplier = suppliers.supplierFor(item.id);
  const others = suppliers.otherIdsFor(item.id).map((id) => suppliers.suppliers.find((s) => s.id === id)).filter(Boolean);

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
        {variantLabel ? (
          <>
            <Row label="Brand">{item.brand}</Row>
            <Row label={variantLabel}>{item.variant}</Row>
          </>
        ) : null}
        <Row label="Category">{item.categoryName}</Row>
        <Row label="Counted in">{unitName}</Row>
        {item.contentMl ? <Row label={`One ${singularUnit(unitName || 'unit').toLowerCase()} holds`}>{contentLabel(item.contentMl)}</Row> : null}
        {showPackaging ? (
          <Row label="Packaging">
            {packages === null ? <span className="isu-muted">Loading…</span> : packages.length
              ? packages.map((p) => `${p.name} (${displayQuantity(p.size)} ${unitName})`).join(', ')
              : null}
          </Row>
        ) : null}
        {suppliers.available ? (
          <Row label="Buy from">
            {supplier ? (
              <>
                {supplier.icon ? `${supplier.icon} ` : ''}{supplier.name}{supplier.is_active ? '' : ' (archived)'}
                {supplier.phone ? <> · <a href={`tel:${supplier.phone.replace(/[^\d+]/g, '')}`}>{supplier.phone}</a></> : null}
                {supplier.email ? <> · <a href={`mailto:${supplier.email}`}>{supplier.email}</a></> : null}
              </>
            ) : null}
          </Row>
        ) : null}
        {others.length ? (
          <Row label="Also from">
            {others.map((s) => `${s.icon ? `${s.icon} ` : ''}${s.name}${s.is_active ? '' : ' (archived)'}`).join(', ')}
          </Row>
        ) : null}
        <Row label="SKU">{item.sku}</Row>
        <Row label="Barcode">{item.barcode}</Row>
        <Row label="Description">{item.description}</Row>
        <Row label="Status">{item.is_active ? 'Active' : 'Archived'}</Row>
      </dl>
      {onEdit ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onEdit}>Edit details</button>
      ) : null}
    </section>
  );
}
