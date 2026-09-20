import React from 'react';
import { USAPL_PLAY_TYPES } from '../../data/usaplIncomePlayType.js';

export default function UsaplAdminIncomePlayType({ idPrefix, value, onChange }) {
  return (
    <div className="usapl-field usapl-income-play-type">
      <span id={`${idPrefix}-play-label`}>Play</span>
      <div className="usapl-choice-row" role="group" aria-labelledby={`${idPrefix}-play-label`}>
        {USAPL_PLAY_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            className={`usapl-choice${value === type.id ? ' selected' : ''}`}
            onClick={() => onChange(type.id)}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
}
