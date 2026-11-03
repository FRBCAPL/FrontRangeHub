import React, { useId } from 'react';
import { CONTENT_UNITS } from '../../utils/itemsureItemContent.js';

/** "One bottle holds 750 ml" on the item form (optional). Used to turn oz or ml pours into the counted unit. */
export default function ItemsureItemContentField({ form, setForm, unitName }) {
  const id = useId();
  const unit = (unitName || 'unit').toLowerCase();
  return (
    <div className="isu-field isu-item-content">
      <label htmlFor={id}>How much one {unit} holds (optional)</label>
      <span className="isu-item-content-inputs">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={form.content_size}
          onChange={(e) => setForm((f) => ({ ...f, content_size: e.target.value }))}
          placeholder="750"
          aria-describedby={`${id}-hint`}
        />
        <select value={form.content_unit} onChange={(e) => setForm((f) => ({ ...f, content_unit: e.target.value }))} aria-label="Size unit">
          {Object.entries(CONTENT_UNITS).map(([key, u]) => <option key={key} value={key}>{u.label}</option>)}
        </select>
      </span>
      <p id={`${id}-hint`} className="isu-hint">For example 750 ml or 1 liter. Lets ItemSure turn drinks poured in oz or ml into {unit}s.</p>
    </div>
  );
}
