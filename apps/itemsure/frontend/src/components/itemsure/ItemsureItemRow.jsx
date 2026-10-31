import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { cardTone, categoryHue, itemInitials } from '../../utils/itemsureItemLook.js';
import { StockAmount as Amount, StockBar, SupplierLine } from './ItemsureStockBits.jsx';

/**
 * One catalog item as a card: name, on hand vs par, where it is, then a status bar. Tap the card to open it.
 * `onCount` (only while a count is open) shows "Add to count", or a "✓ Counted" button that reopens it once counted.
 */
export default function ItemsureItemRow({ item, summary, keptAt, supplier, alsoIn, details, onCount, counted }) {
  const tone = cardTone(summary);
  const hue = categoryHue(item.category_id);
  return (
    <li className={`isu-card isu-stockcard isu-stockcard--${tone}${item.is_active ? '' : ' is-archived'}`}>
      <span
        className={`isu-stockcard-badge${hue === null ? ' is-plain' : ''}`}
        style={hue === null ? undefined : { '--badge-hue': hue }}
        title={item.categoryName || 'No category'}
        aria-hidden="true"
      >
        {itemInitials(item.name)}
      </span>
      <div className="isu-stockcard-body">
        <div className="isu-stockcard-top">
          <div className="isu-stockcard-title">
            <Link to={`${ITEMSURE_PATH}/items/${item.id}`} className="isu-stockcard-link">{item.name}</Link>
            {!item.is_active ? <span className="isu-badge">Archived</span> : null}
            {details ? <span className="isu-stockcard-brand">{details}</span> : null}
            {supplier ? <SupplierLine supplier={supplier} /> : null}
            {alsoIn?.length ? <span className="isu-stockcard-also">Also in {alsoIn.join(', ')}</span> : null}
          </div>
          <Amount summary={summary} unitName={item.unitName} />
        </div>

        {keptAt?.length ? (
          <p className="isu-muted isu-small isu-stockcard-details">
            {keptAt.map((place, n) => (
              <span key={`${place.name}-${n}`}>
                {place.name}:{' '}
                {place.spots.map((s, i) => (
                  <React.Fragment key={`${s.name}-${i}`}>
                    {i ? ', ' : ''}
                    {s.name ? `${s.name} ` : ''}
                    <strong className="isu-stockcard-qty">{s.quantity !== null ? displayQuantity(s.quantity) : '\u2013'}</strong>
                  </React.Fragment>
                ))}
              </span>
            ))}
          </p>
        ) : null}

        <div className="isu-stockcard-bottom">
          <StockBar summary={summary} />
          {onCount ? (
            <div className="isu-stockcard-actions">
              {counted ? (
                <button type="button" className="isu-stockcard-counted" onClick={onCount} aria-label={`Edit the count for ${item.name}`} title="Edit the count">
                  {'\u2713'} Counted
                </button>
              ) : (
                <button type="button" className="isu-stockcard-edit is-count" onClick={onCount} aria-label={`Add ${item.name} to the count`}>Add to count</button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
