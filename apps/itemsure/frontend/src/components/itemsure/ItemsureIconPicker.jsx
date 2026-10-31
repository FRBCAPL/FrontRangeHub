import React from 'react';
import { CATEGORY_ICONS } from '../../data/itemsureCategoryIcons.js';

/** A grid of icons to tap; "None" clears it. `value` is the chosen icon or ''. */
export default function ItemsureIconPicker({ value, onChange, label = 'Icon (optional)' }) {
  return (
    <fieldset className="isu-iconpick">
      <legend>{label}</legend>
      <div className="isu-iconpick-grid" role="group" aria-label={label}>
        <button type="button" className={`isu-iconpick-btn is-none${value ? '' : ' is-selected'}`} aria-pressed={!value} onClick={() => onChange('')}>
          None
        </button>
        {CATEGORY_ICONS.map(({ icon, name }) => (
          <button
            key={icon}
            type="button"
            className={`isu-iconpick-btn${value === icon ? ' is-selected' : ''}`}
            aria-pressed={value === icon}
            aria-label={name}
            title={name}
            onClick={() => onChange(icon)}
          >
            <span aria-hidden="true">{icon}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
