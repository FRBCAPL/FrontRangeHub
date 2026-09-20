import React from 'react';

export default function UsaplAdminIncomePayoutRows({ percents, onChange }) {
  return (
    <div className="usapl-income-payout-places">
      {percents.map((value, index) => {
        const n = index + 1;
        const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
        return (
          <div className="usapl-field" key={n}>
            <label htmlFor={`usapl-payout-place-${n}`}>{n}{suffix} %</label>
            <input
              id={`usapl-payout-place-${n}`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={value}
              onChange={(event) => {
                const next = percents.slice();
                next[index] = event.target.value;
                onChange(next);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
