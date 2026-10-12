import React from 'react';
import { DAYS } from '../../data/duezyOptions.js';

export default function DuezyDayPicker({ value, onChange, label = 'Night you play' }) {
  return (
    <div className="dz-days" role="radiogroup" aria-label={label}>
      {DAYS.map((d) => (
        <button
          key={d}
          type="button"
          role="radio"
          aria-checked={value === d}
          className={value === d ? 'is-active' : ''}
          onClick={() => onChange(d)}
        >
          {d.slice(0, 3)}
        </button>
      ))}
    </div>
  );
}
