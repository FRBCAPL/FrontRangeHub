import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPackages } from '../../services/itemsurePackageService.js';
import useSuppliers from '../../hooks/useSuppliers.js';
import useSupplierPrices from '../../hooks/useSupplierPrices.js';
import { useItemLink } from '../../hooks/useItemModal.js';
import { alwaysWithHint, packagingAttachedLabel, packagingForCatalogItem } from '../../utils/itemsureAlwaysWith.js';
import { Modal } from './ItemsureUi.jsx';
import ItemsureSupplierPrices from './ItemsureSupplierPrices.jsx';
import ItemsureItemAlwaysWith from './ItemsureItemAlwaysWith.jsx';
import {
  IdentifiersSheet,
  WhatItIsSheet,
  identifiersHint,
  whatItIsHint,
} from './ItemsureItemInfoSheets.jsx';

function Row({ label, children }) {
  return (
    <div className="isu-item-info-row">
      <dt>{label}</dt>
      <dd>{children || <span className="isu-muted">{'\u2013'}</span>}</dd>
    </div>
  );
}

function Door({ title, hint, onOpen }) {
  return (
    <button type="button" className="isu-item-info-door" onClick={onOpen}>
      <span className="isu-item-info-door-title">{title}</span>
      {hint ? <span className="isu-item-info-door-hint">{hint}</span> : null}
      <span className="isu-item-info-door-chevron" aria-hidden="true">{'\u203a'}</span>
    </button>
  );
}

/** The Details tab: ordering stays open; catalog facts open in short nested sheets. */
export default function ItemsureItemInfo({
  organizationId, item, unitName, showPackaging, variantLabel, canManagePrices = false,
  categories = [], catalogItems = [], alwaysWith = null, canManageAlwaysWith = false,
}) {
  const [packages, setPackages] = useState(null);
  const [sheet, setSheet] = useState(null);
  const itemLink = useItemLink();
  const suppliers = useSuppliers(organizationId);
  const prices = useSupplierPrices(organizationId);
  const supplier = suppliers.supplierFor(item.id);
  const others = suppliers.otherIdsFor(item.id).map((id) => suppliers.suppliers.find((s) => s.id === id)).filter(Boolean);
  const itemSuppliers = [supplier, ...others].filter(Boolean);
  const showPrices = prices.available && itemSuppliers.length > 0;
  const alwaysRules = alwaysWith?.available ? alwaysWith.forItem(item.id) : [];
  const showAlways = Boolean(alwaysWith?.available);
  const itemsById = new Map((catalogItems || []).map((i) => [i.id, i]));
  const attached = alwaysWith?.available
    ? packagingForCatalogItem(alwaysWith.byItem, item, categories, itemsById)
    : [];

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
    <div className="isu-item-info" aria-label="Details">
      {suppliers.available || showPrices ? (
        <section className="isu-item-info-section" aria-label="Ordering">
          <h4 className="isu-item-info-section-title">Ordering</h4>
          <div className="isu-card isu-item-info-block">
            {suppliers.available ? (
              <dl>
                <Row label="Buy from">
                  {supplier ? (
                    <>
                      {supplier.icon ? `${supplier.icon} ` : ''}{supplier.name}{supplier.is_active ? '' : ' (archived)'}
                      {supplier.phone ? <> · <a href={`tel:${supplier.phone.replace(/[^\d+]/g, '')}`}>{supplier.phone}</a></> : null}
                      {supplier.email ? <> · <a href={`mailto:${supplier.email}`}>{supplier.email}</a></> : null}
                    </>
                  ) : null}
                </Row>
                {!showPrices && others.length ? (
                  <Row label="Also from">
                    {others.map((s) => `${s.icon ? `${s.icon} ` : ''}${s.name}${s.is_active ? '' : ' (archived)'}`).join(', ')}
                  </Row>
                ) : null}
              </dl>
            ) : null}
            {showPrices ? (
              <ItemsureSupplierPrices
                suppliers={itemSuppliers}
                mainId={supplier?.id || null}
                prices={prices.forItem(item.id)}
                canManage={canManagePrices}
                previewLimit={2}
                onSave={canManagePrices ? (supplierId, fields) => prices.save(item.id, supplierId, fields) : null}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {attached.length ? (
        <div className="isu-notice isu-item-always-attached" role="status">
          <p>
            When sold in Clover, also takes off{' '}
            {attached.map((row, i) => (
              <span key={row.itemId}>
                {i ? ', ' : null}
                <Link {...itemLink(row.itemId)} className="isu-link">
                  {packagingAttachedLabel([row])}
                </Link>
              </span>
            ))}
            <span className="isu-muted isu-small"> — Goes with sales</span>
          </p>
        </div>
      ) : null}

      <div className="isu-item-info-doors" role="group" aria-label="More details">
        <Door
          title="What it is"
          hint={whatItIsHint(item, unitName)}
          onOpen={() => setSheet('what')}
        />
        <Door
          title="Identifiers"
          hint={identifiersHint(item)}
          onOpen={() => setSheet('ids')}
        />
        {showAlways ? (
          <Door
            title="Goes with sales"
            hint={alwaysWithHint(alwaysRules, categories)}
            onOpen={() => setSheet('always')}
          />
        ) : null}
      </div>

      <Modal nested open={sheet === 'what'} title="What it is" onClose={() => setSheet(null)}>
        <WhatItIsSheet
          item={item}
          unitName={unitName}
          showPackaging={showPackaging}
          variantLabel={variantLabel}
          packages={packages}
        />
      </Modal>

      <Modal nested open={sheet === 'ids'} title="Identifiers" onClose={() => setSheet(null)}>
        <IdentifiersSheet item={item} />
      </Modal>

      <Modal nested open={sheet === 'always'} title="Goes with sales" onClose={() => setSheet(null)}>
        <ItemsureItemAlwaysWith
          key={`${item.id}-${alwaysRules.map((r) => r.categoryId).join(',')}`}
          organizationId={organizationId}
          item={{ ...item, unitName }}
          categories={categories}
          rules={alwaysRules}
          canManage={canManageAlwaysWith}
          onSave={async (rows) => {
            await alwaysWith.save(item.id, rows);
            setSheet(null);
          }}
        />
      </Modal>
    </div>
  );
}
