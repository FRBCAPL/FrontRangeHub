import React from 'react';
import { USAPL_ROSTER_MODES, usaplRosterModeMeta } from '../../data/usaplRosterSteps.js';

export default function UsaplRosterModeStep({ mode, onChange }) {
  const selected = usaplRosterModeMeta(mode);

  return (
    <>
      <div className="usapl-signup-kinds" role="radiogroup" aria-label="Roster type">
        {USAPL_ROSTER_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={mode === item.id}
            className={`usapl-signup-kind ${mode === item.id ? 'selected' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.range}</span>
          </button>
        ))}
      </div>
      <p className="usapl-lede">{selected.hint}</p>
    </>
  );
}
