import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';

/** What you can do with one item in one spot: add, use, move, or open the item. */
export default function ItemsureStockSpotActions({ item, slot, canAdjust, canMove, onPick }) {
  const status = slot.status ? TARGET_STATUS[slot.status] : null;
  const hasAmount = slot.quantity !== null;
  const unit = item.unitSymbol;
  const par = slot.target?.par_text ?? null;
  const min = slot.target?.minimum_text ?? null;

  return (
    <div className="isu-stack isu-spot-actions">
      <div className="isu-spot-actions-facts">
        <p className="isu-spot-actions-amount">
          <strong>{hasAmount ? displayQuantity(slot.quantity) : '\u2013'}</strong> {unit} on hand
        </p>
        {status ? <span className={`isu-badge isu-status--${status.tone}`}>{status.label}</span> : null}
        <p className="isu-muted isu-small">
          {par !== null || min !== null
            ? [par !== null ? `Par ${displayQuantity(par)}` : 'No par', min !== null ? `warns at ${displayQuantity(min)}` : 'no warning'].join(' \u00b7 ')
            : 'No levels set here'}
        </p>
      </div>

      {hasAmount ? (
        <div className="isu-spot-actions-btns">
          {canAdjust ? (
            <>
              <button type="button" className="isu-btn isu-btn--primary" onClick={() => onPick('add')}>+ Add</button>
              <button type="button" className="isu-btn isu-btn--ghost" onClick={() => onPick('remove')}>{'\u2212'} Use</button>
            </>
          ) : null}
          {canMove ? <button type="button" className="isu-btn isu-btn--ghost" onClick={() => onPick('move')}>Move</button> : null}
        </div>
      ) : (
        <p className="isu-notice">No amount here yet. Count it, or set a starting amount from the item&apos;s page.</p>
      )}

      <Link to={`${ITEMSURE_PATH}/items/${item.id}`} className="isu-link isu-small isu-center">Open {item.name}&apos;s page</Link>
    </div>
  );
}
