import React from 'react';
import { categoryLabel, conditionLabel } from '../../data/consignmentConstants.js';
import './consignment-item-details.css';

/** Labeled item facts for the public item page (category, brand, model, condition, specs, description). */
export default function ConsignmentItemDetails({ item }) {
  const rows = [
    ['Category', categoryLabel(item.category)],
    ['Brand', (item.brand || '').trim()],
    ['Model', (item.model || '').trim()],
    ['Condition', item.condition ? conditionLabel(item.condition) : ''],
    ['Specs', (item.specs || '').trim()],
    ['Description', (item.description || '').trim()],
  ].filter(([, value]) => value);

  if (!rows.length) return null;

  return (
    <dl className="cs-item-details">
      {rows.map(([label, value]) => (
        <div key={label} className="cs-item-detail">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
