import React, { useState } from 'react';
import { checkContent, CONTENT_UNITS } from '../../utils/itemsureItemContent.js';
import { ErrorNote } from './ItemsureUi.jsx';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureSizePresetPick from './ItemsureSizePresetPick.jsx';

/**
 * "How big is one keg / bottle?" for items poured in oz or ml. Tap a common size or type
 * another. onSave([{ item, ml }]) saves the ones with a size.
 */
export default function ItemsurePosSizeReview({ rows, busy, error = '', onSave, onCancel }) {
  const [picked, setPicked] = useState({});
  const set = (id, patch) => setPicked((all) => ({ ...all, [id]: { size: '', unit: 'ml', ...all[id], ...patch } }));
  const mlOf = (id) => {
    const p = picked[id];
    if (!p) return null;
    if (p.preset) return p.preset.ml;
    return checkContent(p.size, p.unit).ml ?? null;
  };
  const ready = rows.filter((r) => mlOf(r.item.id));

  return (
    <div className="isu-stack">
      <p className="isu-muted isu-small">These items are poured in oz or ml, so ItemSure needs to know how much one holds. You only do this once per item.</p>
      <ul className="isu-pos-review isu-pos-sizes">
        {rows.map(({ item, unit }) => {
          const p = picked[item.id] || {};
          const unitName = singularUnit(unit?.name || 'unit').toLowerCase();
          return (
            <li key={item.id}>
              <strong>One {unitName} of {item.name} holds</strong>
              <ItemsureSizePresetPick unit={unit} valueMl={p.preset?.ml} disabled={busy} onPick={(preset) => set(item.id, { preset, size: '' })} />
              <span className="isu-pos-amount-line">
                <span className="isu-muted isu-small">Other:</span>
                <input type="number" inputMode="decimal" min="0" step="any" value={p.size || ''} onChange={(e) => set(item.id, { size: e.target.value, preset: null })} aria-label={`Other size for ${item.name}`} />
                <select value={p.unit || 'ml'} onChange={(e) => set(item.id, { unit: e.target.value, preset: null })} aria-label="Size unit">
                  {Object.entries(CONTENT_UNITS).map(([key, u]) => <option key={key} value={key}>{u.label}</option>)}
                </select>
              </span>
            </li>
          );
        })}
      </ul>
      <ErrorNote message={error} />
      <div className="isu-pos-actions">
        <button type="button" className="isu-btn isu-btn--primary" disabled={busy || !ready.length} onClick={() => onSave(ready.map((r) => ({ item: r.item, ml: mlOf(r.item.id) })))}>
          {busy ? 'Saving…' : `Save sizes (${ready.length})`}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
