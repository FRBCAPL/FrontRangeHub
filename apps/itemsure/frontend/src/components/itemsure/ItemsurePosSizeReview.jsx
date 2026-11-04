import React, { useState } from 'react';
import { checkContent, CONTENT_UNITS } from '../../utils/itemsureItemContent.js';
import { DEFAULT_PIECES } from '../../utils/itemsureCategoryKind.js';
import { ErrorNote } from './ItemsureUi.jsx';
import { singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureSizePresetPick from './ItemsureSizePresetPick.jsx';
import ItemsurePiecesField from './ItemsurePiecesField.jsx';

/**
 * "How big is one keg / bottle?" for items poured in oz or ml, and "How many in one case?" for
 * items sold one at a time out of a case (rows with need: 'pieces'). Tap a common choice or type
 * another. onSave([{ item, ml } | { item, pieces }]) saves the ones answered.
 */
export default function ItemsurePosSizeReview({ rows, busy, error = '', onSave, onCancel }) {
  const [picked, setPicked] = useState(() => Object.fromEntries(
    rows.filter((r) => r.need === 'pieces').map((r) => [r.item.id, { pieces: String(DEFAULT_PIECES) }]),
  ));
  const set = (id, patch) => setPicked((all) => ({ ...all, [id]: { size: '', unit: 'ml', ...all[id], ...patch } }));
  const answer = (row) => {
    const p = picked[row.item.id];
    if (!p) return null;
    if (row.need === 'pieces') {
      const n = Number(p.pieces);
      return n > 0 && n <= 100000 ? { item: row.item, pieces: n } : null;
    }
    const ml = p.preset ? p.preset.ml : checkContent(p.size, p.unit).ml ?? null;
    return ml ? { item: row.item, ml } : null;
  };
  const ready = rows.map(answer).filter(Boolean);

  return (
    <div className="isu-stack">
      <p className="isu-muted isu-small">ItemSure needs to know how much one holds (for drinks poured in oz or ml), or how many come in one (for things sold one at a time from a case). You only do this once per item.</p>
      <ul className="isu-pos-review isu-pos-sizes">
        {rows.map(({ item, unit, need }) => {
          const p = picked[item.id] || {};
          const unitName = singularUnit(unit?.name || 'unit').toLowerCase();
          if (need === 'pieces') {
            return (
              <li key={item.id}>
                <strong>{item.name}</strong>
                <ItemsurePiecesField unitName={unitName} value={p.pieces || ''} onChange={(v) => set(item.id, { pieces: v })} disabled={busy} about={`${item.name} ${item.categoryName || ''}`} />
              </li>
            );
          }
          return (
            <li key={item.id}>
              <strong>One {unitName} of {item.name} holds</strong>
              <ItemsureSizePresetPick unit={unit} hint={`${item.name} ${item.categoryName || ''}`} valueMl={p.preset?.ml} disabled={busy} onPick={(preset) => set(item.id, { preset, size: '' })} />
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
        <button type="button" className="isu-btn isu-btn--primary" disabled={busy || !ready.length} onClick={() => onSave(ready)}>
          {busy ? 'Saving…' : `Save (${ready.length})`}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
