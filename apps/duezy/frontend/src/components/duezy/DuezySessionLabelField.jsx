import React from 'react';
import { SESSION_LABEL_MAX } from '../../utils/duezyTerms.js';

/** "Which session is this?" — a division's session label ("Fall 2026"). */
export default function DuezySessionLabelField({ value, onChange, word = 'session', optional = true, label }) {
  return (
    <label className="dz-field">
      <span>{label || `Which ${word} is this?`} {optional ? <em className="dz-muted">(optional)</em> : null}</span>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Fall 2026"
        maxLength={SESSION_LABEL_MAX}
      />
    </label>
  );
}
