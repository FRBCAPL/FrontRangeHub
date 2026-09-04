import React from 'react';
import { USAPL_SIGNUP_KINDS, usaplSignupKindMeta } from '../../data/usaplSignupSteps.js';

export default function UsaplSignupKindStep({ kind, onChange }) {
  const selected = usaplSignupKindMeta(kind);

  return (
    <>
      <div className="usapl-signup-kinds" role="radiogroup" aria-label="How you are joining">
        {USAPL_SIGNUP_KINDS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={kind === item.id}
            className={`usapl-signup-kind ${kind === item.id ? 'selected' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.range}</span>
          </button>
        ))}
      </div>
      <p className="usapl-lede">{selected.hint}</p>
    </>
  );
}
