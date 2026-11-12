import React from 'react';

const KINDS = [
  { id: 'shop', label: 'Shop tag' },
  { id: 'sold', label: 'Sold tag' },
];

export default function ConsignmentTagKindToggle({ value, onChange, plural = false }) {
  return (
    <div className="cs-print-shapes" role="radiogroup" aria-label="Tag type">
      {KINDS.map((k) => (
        <button
          key={k.id}
          type="button"
          role="radio"
          aria-checked={value === k.id}
          className={value === k.id ? 'active' : ''}
          onClick={() => onChange(k.id)}
        >
          {plural ? `${k.label}s` : k.label}
        </button>
      ))}
    </div>
  );
}
