import React from 'react';

const SHAPES = [
  { id: 'card', label: 'Card 3.5" × 2"' },
  { id: 'hang', label: 'Hang tag 2" × 3.5"' },
];

export default function ConsignmentTagShapeToggle({ value, onChange }) {
  return (
    <div className="cs-print-shapes" role="radiogroup" aria-label="Tag shape">
      {SHAPES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={value === s.id}
          className={value === s.id ? 'active' : ''}
          onClick={() => onChange(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
