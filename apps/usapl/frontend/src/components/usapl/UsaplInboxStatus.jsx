import React from 'react';

export default function UsaplInboxStatus({ label, hint, value, options, onChange }) {
  return (
    <div className="usapl-field" style={{ maxWidth: '28rem', marginTop: 8 }}>
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      {hint ? <p className="usapl-field-hint">{hint}</p> : null}
    </div>
  );
}
