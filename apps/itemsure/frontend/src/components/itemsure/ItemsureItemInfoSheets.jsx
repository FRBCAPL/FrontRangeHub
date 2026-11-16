import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { contentLabel } from '../../utils/itemsureItemContent.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';

function Row({ label, children }) {
  return (
    <div className="isu-item-info-row">
      <dt>{label}</dt>
      <dd>{children || <span className="isu-muted">{'\u2013'}</span>}</dd>
    </div>
  );
}

/** Body for the "What it is" detail sheet. */
export function WhatItIsSheet({ item, unitName, showPackaging, variantLabel, packages }) {
  const unit = singularUnit(unitName || 'unit').toLowerCase();
  return (
    <div className="isu-card isu-item-info-block">
      <dl>
        {variantLabel ? (
          <>
            <Row label="Brand">{item.brand}</Row>
            <Row label={variantLabel}>{item.variant}</Row>
          </>
        ) : null}
        <Row label="Category">{item.categoryName}</Row>
        <Row label="Counted in">{unitName}</Row>
        {item.contentMl ? <Row label={`One ${unit} holds`}>{contentLabel(item.contentMl)}</Row> : null}
        {!item.contentMl && item.categorySize ? (
          <Row label={`One ${unit} holds`}>
            {contentLabel(item.categorySize.ml)} <span className="isu-muted isu-small">(uses {item.categorySize.fromCategory})</span>
          </Row>
        ) : null}
        {item.pieces != null || item.categoryPieces ? (
          <Row label={`In one ${unit}`}>
            {item.pieces != null ? String(item.pieces) : (
              <>{String(item.categoryPieces.pieces)} <span className="isu-muted isu-small">(uses {item.categoryPieces.fromCategory})</span></>
            )}
          </Row>
        ) : null}
        {showPackaging ? (
          <Row label="Packaging">
            {packages === null ? <span className="isu-muted">Loading…</span> : packages.length
              ? packages.map((p) => `${p.name} (${displayQuantity(p.size)} ${unitName})`).join(', ')
              : null}
          </Row>
        ) : null}
      </dl>
    </div>
  );
}

/** Body for the Identifiers detail sheet. */
export function IdentifiersSheet({ item }) {
  return (
    <div className="isu-card isu-item-info-block">
      <dl>
        <Row label="SKU">{item.sku}</Row>
        <Row label="Barcode">{item.barcode}</Row>
        <Row label="Description">{item.description}</Row>
        <Row label="Status">{item.is_active ? 'Active' : 'Archived'}</Row>
      </dl>
    </div>
  );
}

/** One-line hint under a Details door button. */
export function whatItIsHint(item, unitName) {
  return [item.categoryName, unitName].filter(Boolean).join(' · ') || 'Category, size, packaging';
}

export function identifiersHint(item) {
  if (item.sku) return `SKU ${item.sku}`;
  if (item.barcode) return `Barcode ${item.barcode}`;
  return item.is_active ? 'Active' : 'Archived';
}
