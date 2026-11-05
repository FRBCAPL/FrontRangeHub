import React from 'react';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import { MAX_INGREDIENTS } from '../../utils/itemsureRecipes.js';
import ItemsureItemSearchPick from './ItemsureItemSearchPick.jsx';

/**
 * A recipe's ingredients, in order (the first is the main one). rows: [{ itemId, amount (text),
 * unit }]. An empty amount means the category's usual pour.
 */
export default function ItemsureRecipeLines({ rows, items, busy, onChange }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const left = items.filter((i) => i.is_active && !rows.some((r) => r.itemId === i.id));
  const set = (index, patch) => onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const up = (index) => onChange(rows.map((r, i) => (i === index - 1 ? rows[index] : i === index ? rows[index - 1] : r)));

  return (
    <div className="isu-pos-pour-field">
      {rows.map((row, index) => {
        const item = byId.get(row.itemId);
        const name = item ? item.name : 'Item no longer in your catalog';
        const unitName = singularUnit(item?.unitName || 'unit').toLowerCase();
        return (
          <div key={row.itemId} className="isu-pos-mod-line">
            <strong>{name}{index === 0 && rows.length > 1 ? <span className="isu-extra-category-tag">main</span> : null}</strong>
            <span className="isu-pos-pour-inputs">
              <input type="number" inputMode="decimal" min="0" step="any" value={row.amount} placeholder="usual" disabled={busy}
                onChange={(e) => set(index, { amount: e.target.value })} aria-label={`Amount of ${name}`} />
              <select value={row.unit} disabled={busy || !String(row.amount).trim()} onChange={(e) => set(index, { unit: e.target.value })} aria-label={`Unit for ${name}`}>
                <option value="fl_oz">oz</option>
                <option value="ml">ml</option>
                <option value="base">{unitName}</option>
                <option value="piece">single from the {unitName}</option>
              </select>
              {index > 0 ? (
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => up(index)} aria-label={`Move ${name} up`}>
                  {'\u2191'}
                </button>
              ) : null}
              <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy}
                onClick={() => onChange(rows.filter((_, i) => i !== index))} aria-label={`Remove ${name}`}>
                {'\u00d7'}
              </button>
            </span>
          </div>
        );
      })}
      {rows.length < MAX_INGREDIENTS && left.length ? (
        <ItemsureItemSearchPick items={left} label={rows.length ? '+ Add an ingredient' : 'Pick the first ingredient'} disabled={busy}
          onPick={(itemId) => onChange([...rows, { itemId, amount: '', unit: 'fl_oz' }])} />
      ) : null}
      {rows.length ? (
        <span className="isu-muted isu-small">
          Leave the amount empty to use the category&apos;s usual pour (like 1.5 oz for liquor). Oz or ml need the item&apos;s size, and singles need how many come in one.
        </span>
      ) : null}
    </div>
  );
}
