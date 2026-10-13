import React, { useState } from 'react';
import { METHODS } from '../../data/duezyOptions.js';
import { MAX_METHODS, METHOD_NAME_MAX, cleanMethodName, findMethod } from '../../utils/duezyLeaguePrefs.js';

/**
 * "Other" payment methods the league names itself (house tab, Square, gift card…).
 * `methods` = everything currently accepted; onChange gets the full new list.
 */
export default function DuezyOtherMethods({ methods, onChange }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const customs = methods.filter((m) => !METHODS.includes(m));
  const full = methods.length >= MAX_METHODS;

  const add = () => {
    const clean = cleanMethodName(name);
    if (!clean) return;
    const existing = findMethod(methods, clean);
    if (existing && methods.includes(existing)) {
      setNote(`${existing} is already on your list.`);
      return;
    }
    onChange([...methods, existing || clean]);
    setName('');
    setNote(existing ? `${existing} turned on.` : '');
    setAdding(false);
  };

  const remove = (m) => {
    if (methods.length > 1) onChange(methods.filter((x) => x !== m));
  };

  return (
    <div className="dz-other-methods">
      {customs.map((m) => (
        <span key={m} className="dz-other-chip">
          {m}
          <button
            type="button"
            onClick={() => remove(m)}
            disabled={methods.length === 1}
            aria-label={`Remove ${m}`}
            title={`Remove ${m}`}
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <span className="dz-other-add">
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setNote(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); add(); }
              if (e.key === 'Escape') { setAdding(false); setName(''); }
            }}
            placeholder="e.g. House tab, Square"
            maxLength={METHOD_NAME_MAX}
            aria-label="Name of the other payment method"
            autoFocus
          />
          <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={add} disabled={!cleanMethodName(name)}>Add</button>
          <button type="button" className="dz-link dz-small" onClick={() => { setAdding(false); setName(''); setNote(''); }}>Cancel</button>
        </span>
      ) : (
        <button type="button" className="dz-other-btn" onClick={() => setAdding(true)} disabled={full}>
          + Other…
        </button>
      )}
      {note ? <small className="dz-small dz-muted dz-other-note" role="status">{note}</small> : null}
      {full && !adding ? <small className="dz-small dz-muted dz-other-note">Up to {MAX_METHODS} methods — remove one to add another.</small> : null}
    </div>
  );
}
