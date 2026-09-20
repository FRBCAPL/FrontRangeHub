import React from 'react';

export default function UsaplIncomeStepper({ id, label, value, min = 1, max = 64, onChange }) {
  const n = Number.parseInt(value, 10);
  const current = Number.isInteger(n) ? n : min;
  const set = (next) => onChange(String(Math.min(max, Math.max(min, next))));
  return (
    <div className="usapl-field usapl-income-stepper">
      <label htmlFor={id}>{label}</label>
      <div className="usapl-income-stepper-row">
        <button type="button" className="usapl-income-stepper-btn" onClick={() => set(current - 1)} aria-label={`Fewer ${label}`}>
          −
        </button>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step="1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" className="usapl-income-stepper-btn" onClick={() => set(current + 1)} aria-label={`More ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}
