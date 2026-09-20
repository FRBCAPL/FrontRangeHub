import React from 'react';
import { USAPL_COMMON_TEAM_SIZES } from '../../data/usaplIncomeTeamSize.js';

export default function UsaplAdminIncomePlayers({ idPrefix, value, onChange }) {
  return (
    <div className="usapl-field usapl-income-players">
      <span id={`${idPrefix}-players-label`}>Players per team</span>
      <div
        className="usapl-choice-row"
        role="group"
        aria-labelledby={`${idPrefix}-players-label`}
      >
        {USAPL_COMMON_TEAM_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            className={`usapl-choice${Number(value) === size ? ' selected' : ''}`}
            onClick={() => onChange(String(size))}
          >
            {size}
          </button>
        ))}
      </div>
      <input type="hidden" id={`${idPrefix}-players`} value={value} readOnly />
    </div>
  );
}
