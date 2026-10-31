import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { spotLabel } from '../../utils/itemsureShoppingList.js';
import { site } from '../../data/itemsureTerms.js';

const fromLabel = (move, withLocation) =>
  withLocation || !move.same_location ? `${move.location_name} \u00b7 ${move.area_name || NO_AREA_LABEL}` : move.area_name || NO_AREA_LABEL;

/** Spare stock elsewhere that can top a place up instead of buying. */
export default function ItemsureShoppingMoves({ moves, canTransfer, withLocation, onAction }) {
  if (!moves.length) return null;
  return (
    <section className="isu-shop-section">
      <h2 className="isu-shop-heading">Move instead <span className="isu-muted isu-small">({moves.length})</span></h2>
      <p className="isu-muted isu-small isu-shop-note">Spare stock you already have in another place.</p>
      <ul className="isu-shop-list">
        {moves.map(({ key, rec, move }) => (
          <li key={key} className={`isu-shop-row isu-shop-move ${rec.status === 'low' ? 'is-low' : 'is-topup'}`}>
            <div className="isu-shop-row-main">
              <div className="isu-shop-row-body is-static">
                <span className="isu-shop-name">{rec.item_name}</span>
                <span className="isu-shop-where">
                  {fromLabel(move, withLocation)} → {spotLabel(rec, withLocation || !move.same_location)}
                  {move.same_location ? '' : ` (other ${site})`}
                </span>
              </div>
              <span className="isu-shop-amount">{displayQuantity(move.quantity)} {rec.unit_symbol}</span>
            </div>
            {canTransfer ? (
              <div className="isu-restock-move-actions isu-shop-move-actions">
                {move.same_location ? null : (
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAction('plan', rec, move)}>Plan</button>
                )}
                <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => onAction('transfer', rec, move)}>Transfer</button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
