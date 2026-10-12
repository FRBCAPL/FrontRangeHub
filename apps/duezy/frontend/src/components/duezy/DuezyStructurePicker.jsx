import React from 'react';

const OPTIONS = [
  { value: 'single', icon: '①', title: 'Single division', text: 'One group of teams, one night.' },
  { value: 'multi', icon: '☰', title: 'Multiple divisions', text: 'Different nights, skill levels or formats.' },
];

export default function DuezyStructurePicker({ value, onChange }) {
  return (
    <div className="dz-structure" role="radiogroup" aria-label="How is your league set up?">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`dz-structure-opt${value === o.value ? ' is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          <span className="dz-structure-icon" aria-hidden="true">{o.icon}</span>
          <strong>{o.title}</strong>
          <small>{o.text}</small>
        </button>
      ))}
    </div>
  );
}
