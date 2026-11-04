import React, { useMemo, useState } from 'react';
import { categoryAmountRows } from '../../utils/itemsureCategoryDefaults.js';
import { contentLabel } from '../../utils/itemsureItemContent.js';
import { POUR_UNITS } from '../../utils/itemsurePosUsage.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import { ErrorNote } from './ItemsureUi.jsx';
import ItemsureCategoryAmountForm from './ItemsureCategoryAmountForm.jsx';

const trimNum = (n) => String(Math.round(n * 1000) / 1000);

function describe(value, unit) {
  if (!value) return '';
  const unitName = singularUnit(unit?.name || 'unit').toLowerCase();
  const parts = [];
  const unitWord = { base: `whole ${unitName}`, piece: value.amount === 1 ? 'single' : 'singles' }[value.unit] || POUR_UNITS[value.unit];
  if (value.amount != null) parts.push(`${trimNum(value.amount)} ${unitWord} a sale`);
  if (value.contentMl != null) parts.push(`${unitName} holds ${contentLabel(value.contentMl)}`);
  if (value.pieces != null) parts.push(`${trimNum(value.pieces)} in a ${unitName}`);
  return parts.join(' · ');
}

/**
 * "Category amounts": set how much a sale uses and how big one is for a whole category
 * (Liquor: 1.5 oz a sale, 750 ml bottles). Items without their own value follow it, including
 * later changes. onSave(categoryId, value) returns true when saved.
 */
export default function ItemsureCategoryAmounts({ summary, canEdit, busy, error, onSave, onClose }) {
  const [editing, setEditing] = useState('');
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(() => categoryAmountRows(summary), [summary]);
  const byId = new Map(rows.map((r) => [r.category.id, r]));
  const used = rows.filter((r) => r.matched || r.value);
  const shown = showAll ? rows : used;

  if (!rows.length) {
    return <p className="isu-muted">No categories yet. Add categories (like Liquor or Beer) on the Inventory page first.</p>;
  }

  const save = async (row, value) => {
    if (await onSave(row.category.id, value)) setEditing('');
  };

  return (
    <div className="isu-stack isu-cat-amounts">
      <p className="isu-muted isu-small">
        Set it once for a whole category, like Liquor: 1.5 oz a sale from 750 ml bottles, or Bottled beer: 1 single a sale, 24 in a case. Items follow it unless you give them their own.
      </p>
      <ErrorNote message={error} />
      {!shown.length ? <p className="isu-muted">None of your categories have matched Clover items yet.</p> : null}
      <ul className="isu-cat-amount-list">
        {shown.map((row) => {
          const parent = row.depth ? byId.get(row.category.parent_category_id) : null;
          const parentName = parent?.category.name || '';
          const text = describe(row.value, row.unit) || (parent?.value ? `Uses ${parentName}'s` : 'Not set');
          return (
            <li key={row.category.id} className={`isu-cat-amount${row.depth ? ' is-sub' : ''}`}>
              {editing === row.category.id ? (
                <>
                  <strong>{row.category.name}</strong>
                  <ItemsureCategoryAmountForm row={row} parentName={parentName} piecesReady={summary.piecesReady} busy={busy} onSave={(value) => save(row, value)} onCancel={() => setEditing('')} />
                </>
              ) : (
                <>
                  <div className="isu-cat-amount-text">
                    <strong>{row.category.name}</strong>
                    <span className={`isu-small${row.value ? '' : ' isu-muted'}`}>{text}</span>
                    <span className="isu-muted isu-small">{row.matched} matched item{row.matched === 1 ? '' : 's'}</span>
                  </div>
                  {canEdit ? (
                    <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy || Boolean(editing)} onClick={() => setEditing(row.category.id)}>
                      {row.value ? 'Change' : 'Set'}
                    </button>
                  ) : null}
                </>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length > used.length ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Only categories with matched items' : `Show all ${rows.length} categories`}
        </button>
      ) : null}
      <button type="button" className="isu-btn isu-btn--primary" onClick={onClose}>Done</button>
    </div>
  );
}
