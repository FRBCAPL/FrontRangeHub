import React from 'react';

/** One catalog item: details, where it's kept, and the manage buttons. */
export default function ItemsureItemRow({ item, keptAt, canManage, busy, onEdit, onToggle }) {
  const details = [item.categoryName || 'No category', item.unitName, item.sku && `SKU ${item.sku}`, item.barcode && `Barcode ${item.barcode}`]
    .filter(Boolean)
    .join(' \u00b7 ');

  return (
    <li className={`isu-card isu-item${item.is_active ? '' : ' is-archived'}`}>
      <div>
        <strong>{item.name}</strong>
        <p className="isu-muted isu-small">{details}</p>
        {keptAt?.length ? <p className="isu-muted isu-small">Kept at: {keptAt.join(', ')}</p> : null}
      </div>
      {canManage ? (
        <div className="isu-item-actions">
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onEdit} aria-label={`Edit ${item.name}`}>
            Edit
          </button>
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onToggle}>
            {item.is_active ? 'Archive' : 'Restore'}
          </button>
        </div>
      ) : !item.is_active ? (
        <span className="isu-badge">Archived</span>
      ) : null}
    </li>
  );
}
