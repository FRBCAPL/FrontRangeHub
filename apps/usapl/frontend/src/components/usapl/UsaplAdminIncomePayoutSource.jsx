import React from 'react';
import { USAPL_PAYOUT_SOURCES } from '../../data/usaplIncomePayout.js';

export default function UsaplAdminIncomePayoutSource({ value, onChange }) {
  return (
    <div className="usapl-field usapl-income-payout-source">
      <span id="usapl-payout-source-label">Pay from</span>
      <div className="usapl-choice-row" role="group" aria-labelledby="usapl-payout-source-label">
        {USAPL_PAYOUT_SOURCES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`usapl-choice${value === option.id ? ' selected' : ''}`}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
