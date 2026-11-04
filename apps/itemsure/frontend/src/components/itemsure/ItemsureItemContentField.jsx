import React, { useId } from 'react';
import { checkContent, CONTENT_UNITS } from '../../utils/itemsureItemContent.js';
import { pluralUnit, singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureSizePresetPick from './ItemsureSizePresetPick.jsx';

/** "One bottle holds 750 ml" on the item form (optional). Used to turn oz or ml pours into the counted unit. */
export default function ItemsureItemContentField({ form, setForm, unit }) {
  const id = useId();
  const unitName = singularUnit(unit?.name || 'unit').toLowerCase();
  const unitPlural = pluralUnit(unitName);
  const ml = checkContent(form.content_size, form.content_unit).ml;
  return (
    <div className="isu-field isu-item-content">
      <label htmlFor={id}>How much one {unitName} holds (optional)</label>
      <ItemsureSizePresetPick unit={unit} valueMl={ml} onPick={(p) => setForm((f) => ({ ...f, ...p.input }))} />
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
      <p id={`${id}-hint`} className="isu-hint">Tap a common size or type your own. Lets ItemSure turn drinks poured in oz or ml into {unitPlural}.</p>
    </div>
  );
}
