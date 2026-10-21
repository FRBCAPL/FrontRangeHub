import React from 'react';

const FIELDS = [
  { key: 'entrants', label: 'Players', hint: 'Exact number signed up', step: '1' },
  { key: 'tables', label: 'Pool tables', hint: 'Tables you can use', step: '1' },
  { key: 'hours', label: 'Time available (hours)', hint: 'e.g. 5.5 for 5 hr 30 min', step: '0.25' },
  { key: 'entryFee', label: 'Entry fee ($)', hint: 'Per player', step: '1' },
  { key: 'minutesPerGame', label: 'Minutes per game', hint: 'Average pace at your room', step: '1' },
];

export default function SmartBuilderInputs({ form, problems = [], onChange }) {
  return (
    <form className="sb-inputs" onSubmit={(e) => e.preventDefault()} aria-label="Your tournament night">
      <div className="sb-input-grid">
        {FIELDS.map((f) => (
          <label key={f.key} className="sb-field">
            <span className="sb-field-label">{f.label}</span>
            <input
              type="number"
              inputMode="decimal"
              step={f.step}
              value={form[f.key]}
              onChange={(e) => onChange({ [f.key]: e.target.value })}
            />
            <span className="sb-field-hint">{f.hint}</span>
          </label>
        ))}
      </div>
      {problems.length ? (
        <ul className="sb-problems" role="alert">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      ) : null}
    </form>
  );
}
