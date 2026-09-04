import React from 'react';
import { USAPL_CONTACT_METHODS } from '../../data/usaplContact.js';

export default function UsaplPreferredContact({ value, onChange }) {
  return (
    <div className="usapl-field">
      <label>Preferred contact *</label>
      <div className="usapl-choice-row" role="radiogroup" aria-label="Preferred contact">
        {USAPL_CONTACT_METHODS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={value === item.id}
            className={`usapl-choice ${value === item.id ? 'selected' : ''}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
