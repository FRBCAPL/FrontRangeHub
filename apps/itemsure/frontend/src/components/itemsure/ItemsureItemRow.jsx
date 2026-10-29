import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';

function OnHand({ summary, unitName }) {
  if (!summary) return null;
  const status = summary.status && summary.status !== 'not_set_up' ? TARGET_STATUS[summary.status] : null;
  return (
    <p className="isu-item-onhand">
      {summary.total === null ? (
        <span className="isu-muted">No amount yet</span>
      ) : (
        <span><strong>{displayQuantity(summary.total)}</strong> {unitName} on hand</span>
      )}
      {status && status.tone !== 'ok' ? <span className={`isu-badge isu-status--${status.tone}`}>{status.label}</span> : null}
    </p>
  );
}

/** One catalog item: how many, details, where it's kept, and the manage buttons. Tap the name for the item page. */
export default function ItemsureItemRow({ item, summary, keptAt, packages, canManage, busy, onEdit, onToggle }) {
  const details = [item.categoryName || 'No category', item.unitName, item.sku && `SKU ${item.sku}`, item.barcode && `Barcode ${item.barcode}`]
    .filter(Boolean)
    .join(' \u00b7 ');

  return (
    <li className={`isu-card isu-item${item.is_active ? '' : ' is-archived'}`}>
      <div>
        <Link to={`${ITEMSURE_PATH}/items/${item.id}`} className="isu-item-name">{item.name}</Link>
        <OnHand summary={summary} unitName={item.unitName} />
        <p className="isu-muted isu-small">{details}</p>
        {keptAt?.length ? <p className="isu-muted isu-small">At: {keptAt.join(', ')}</p> : null}
        {packages?.length ? (
          <p className="isu-muted isu-small">Packaging: {packages.map((p) => `${p.name} = ${p.size}`).join(', ')}</p>
        ) : null}
      </div>
      <div className="isu-item-actions">
        <Link to={`${ITEMSURE_PATH}/items/${item.id}`} className="isu-btn isu-btn--primary isu-btn--sm">Open</Link>
        {canManage ? (
          <>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onEdit} aria-label={`Edit ${item.name}`}>
              Edit
            </button>
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onToggle}>
              {item.is_active ? 'Archive' : 'Restore'}
            </button>
          </>
        ) : !item.is_active ? (
          <span className="isu-badge">Archived</span>
        ) : null}
      </div>
    </li>
  );
}
