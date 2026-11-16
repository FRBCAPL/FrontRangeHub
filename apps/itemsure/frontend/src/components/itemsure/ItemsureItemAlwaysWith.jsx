import React, { useState } from 'react';
import { categoryPath, categoryTree } from '../../utils/itemsureCategories.js';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import { alwaysWithToForm, checkAlwaysWith } from '../../utils/itemsureAlwaysWith.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Tip } from './ItemsureUi.jsx';
import ItemsureCategoryChooser from './ItemsureCategoryChooser.jsx';

/**
 * Edit Goes with sales for one packaging item: categories + amount taken once per matching sale.
 * onSave(rows) should persist; returns a promise.
 */
export default function ItemsureItemAlwaysWith({
  organizationId, item, categories, rules, canManage, onSave,
}) {
  const [rows, setRows] = useState(() => alwaysWithToForm(rules));
  const [picking, setPicking] = useState(false);
  const [problem, setProblem] = useState('');
  const { busy, error, run } = useItemsureAction();
  const tree = categoryTree(categories);
  const unitName = singularUnit(item.unitName || 'unit').toLowerCase();
  const chosen = rows.map((r) => r.categoryId);
  const anyLeft = categories.some((c) => tree.byId.has(c.id) && !chosen.includes(c.id));

  const setRow = (categoryId, patch) => setRows((list) => list.map((r) => (r.categoryId === categoryId ? { ...r, ...patch } : r)));
  const remove = (categoryId) => setRows((list) => list.filter((r) => r.categoryId !== categoryId));

  const save = () => {
    const checked = checkAlwaysWith(rows, new Set(categories.map((c) => c.id)));
    if (checked.error) {
      setProblem(checked.error);
      return;
    }
    setProblem('');
    run(async () => {
      await onSave(checked.rows);
    });
  };

  if (!canManage && !rows.length) {
    return <p className="isu-muted">Not set up for any category.</p>;
  }

  return (
    <div className="isu-stack isu-item-always-with">
      <p className="isu-muted isu-small">
        Taken off once when a Clover sale uses anything in these categories (including subcategories).
        Skipped if this item is already on that button or recipe.
      </p>
      {rows.length ? (
        <ul className="isu-always-with-list" aria-label="Goes with sales">
          {rows.map((row) => (
            <li key={row.categoryId} className="isu-always-with-row">
              <strong>{categoryPath(tree, row.categoryId) || 'Category'}</strong>
              {canManage ? (
                <span className="isu-pos-pour-inputs">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={row.amount}
                    disabled={busy}
                    onChange={(e) => setRow(row.categoryId, { amount: e.target.value })}
                    aria-label={`Amount for ${categoryPath(tree, row.categoryId)}`}
                  />
                  <select
                    value={row.unit}
                    disabled={busy}
                    onChange={(e) => setRow(row.categoryId, { unit: e.target.value })}
                    aria-label={`Unit for ${categoryPath(tree, row.categoryId)}`}
                  >
                    <option value="base">{unitName}</option>
                    <option value="piece">single from the {unitName}</option>
                    <option value="fl_oz">oz</option>
                    <option value="ml">ml</option>
                  </select>
                  <Tip label="Stop taking this packaging off when that category sells">
                    <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => remove(row.categoryId)} aria-label="Remove">
                      {'\u00d7'}
                    </button>
                  </Tip>
                </span>
              ) : (
                <span className="isu-muted isu-small">{row.amount} {row.unit === 'base' ? unitName : row.unit}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="isu-muted isu-small">No categories yet — add Food (or similar) for packaging that rides along.</p>
      )}
      {canManage && anyLeft ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setPicking(true)}>
          + Add {rows.length ? 'another' : 'a'} category
        </button>
      ) : null}
      <ErrorNote message={problem || error} />
      {canManage ? (
        <div className="isu-item-edit-nav">
          <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : null}
      <ItemsureCategoryChooser
        open={picking}
        title="Goes with sales"
        organizationId={organizationId}
        categories={categories}
        exclude={chosen}
        excludeNote={() => 'added'}
        canManage={false}
        onChoose={(id) => {
          if (id) setRows((list) => [...list, { categoryId: id, amount: '1', unit: 'base' }]);
        }}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}
