import React, { useState } from 'react';

/**
 * A "+ Add a place" button that opens a short list of places to tap.
 * `options` are [{ key, label }]; `onPick(key)` runs for the tapped one and the list closes.
 */
export default function ItemsurePlacePicker({ label, options, onPick }) {
  const [open, setOpen] = useState(false);
  if (!options.length) return null;
  if (!open) {
    return (
      <button type="button" className="isu-btn isu-btn--ghost isu-place-picker-open" onClick={() => setOpen(true)} aria-expanded="false">
        + {label}
      </button>
    );
  }
  return (
    <div className="isu-place-picker" role="group" aria-label={label}>
      <p className="isu-place-picker-title">{label}: tap one</p>
      <div className="isu-place-picker-list">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className="isu-chip isu-chip--choice"
            onClick={() => {
              setOpen(false);
              onPick(o.key);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button type="button" className="isu-place-picker-cancel" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
