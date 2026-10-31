import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';

/** How many spots the item's stock is split across, from whereAmounts(). */
export function spotCount(keptAt) {
  return (keptAt || []).reduce((n, place) => n + place.spots.length, 0);
}

function Places({ keptAt }) {
  const named = keptAt.length > 1;
  return keptAt.map((place, n) => (
    <React.Fragment key={`${place.name}-${n}`}>
      {n ? ' \u00b7 ' : ''}
      {named ? `${place.name}: ` : ''}
      {place.spots.map((s, i) => (
        <React.Fragment key={`${s.name}-${i}`}>
          {i ? ', ' : ''}
          {s.name || (named ? '' : place.name)}{' '}
          <strong className="isu-stockcard-qty">{s.quantity !== null ? displayQuantity(s.quantity) : '\u2013'}</strong>
        </React.Fragment>
      ))}
    </React.Fragment>
  ));
}

/**
 * One small grey line under the name with only what is worth knowing:
 * the supplier, where the stock is split, and other categories it is found in.
 * Callers decide which parts to pass; nothing renders when there are none.
 */
export default function ItemsureItemMeta({ supplier = null, keptAt = null, alsoIn = [] }) {
  const parts = [];
  if (supplier) {
    parts.push(
      <span key="supplier" title="Main supplier">
        <span aria-hidden="true">{'\u26DF'}</span> {supplier.name}{supplier.is_active ? '' : ' (archived)'}
      </span>,
    );
  }
  if (keptAt?.length) parts.push(<span key="places"><Places keptAt={keptAt} /></span>);
  if (alsoIn.length) parts.push(<span key="also">Also in {alsoIn.join(', ')}</span>);
  if (!parts.length) return null;
  return <p className="isu-stockcard-meta">{parts}</p>;
}
