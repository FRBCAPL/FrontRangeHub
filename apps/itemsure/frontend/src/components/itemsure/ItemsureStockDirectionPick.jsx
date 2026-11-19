import React, { useEffect, useState } from 'react';

const CHOICES = [
  { value: 'add', label: 'Add stock', hint: 'Delivery, restock, or put more on hand' },
  { value: 'remove', label: 'Use stock', hint: 'Used, wasted, damaged, or took some off' },
];

/**
 * First step before Add / Use: pick a direction. `initial` is pre-selected from the Home
 * card (add / use) or defaults to add when opened from Stock → Add / Use.
 */
export default function ItemsureStockDirectionPick({ initial = 'add', onContinue }) {
  const [direction, setDirection] = useState(initial === 'remove' ? 'remove' : 'add');

  useEffect(() => {
    setDirection(initial === 'remove' ? 'remove' : 'add');
  }, [initial]);

  return (
    <div className="isu-stack isu-stock-dir">
      <p className="isu-muted isu-small">Are you putting stock on hand, or taking some off?</p>
      <div className="isu-stock-dir-picks" role="group" aria-label="Add or use">
        {CHOICES.map((c) => {
          const on = direction === c.value;
          return (
            <button
              key={c.value}
              type="button"
              className={`isu-stock-dir-pick${on ? ' is-selected' : ''}`}
              aria-pressed={on}
              onClick={() => setDirection(c.value)}
            >
              <strong>{c.label}</strong>
              <span className="isu-muted isu-small">{c.hint}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="isu-btn isu-btn--primary isu-btn--block" onClick={() => onContinue(direction)}>
        Continue
      </button>
    </div>
  );
}
