import React, { useState } from 'react';
import { SPORTS, isCustomSport } from '../../data/duezyOptions.js';

export default function DuezySportPicker({ value, onChange }) {
  const [otherOpen, setOtherOpen] = useState(value === 'other' || isCustomSport(value));
  const activeValue = otherOpen ? 'other' : value;
  const customText = value === 'other' ? '' : isCustomSport(value) ? value : '';

  const pick = (sportValue) => {
    setOtherOpen(sportValue === 'other');
    onChange(sportValue === 'other' ? customText || 'other' : sportValue);
  };

  return (
    <>
      <div className="dz-sports" role="radiogroup" aria-label="What do you play?">
        {SPORTS.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={activeValue === s.value}
            className={`dz-sport${activeValue === s.value ? ' is-active' : ''}`}
            onClick={() => pick(s.value)}
          >
            <span className="dz-sport-icon" aria-hidden="true">{s.icon}</span>
            <span>{s.short}</span>
          </button>
        ))}
      </div>
      {otherOpen ? (
        <input
          className="dz-sport-other"
          value={customText}
          onChange={(e) => onChange(e.target.value || 'other')}
          placeholder="What do you play? e.g. Pickleball"
          aria-label="Your sport or game"
          maxLength={30}
          autoFocus
        />
      ) : null}
    </>
  );
}
