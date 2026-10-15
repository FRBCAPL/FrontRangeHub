import React, { useState } from 'react';
import DuezyModal from './DuezyModal.jsx';

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** "Add player" popup on the sign-up page. Add keeps it open for the next name; Done closes it. */
export default function DuezyJoinPlayerModal({ taken, onAdd, onClose }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  const add = (e) => {
    // The popup is portaled, but React still bubbles submit to the sign-up form around it.
    e.preventDefault();
    e.stopPropagation();
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) return setNote('Type the player’s name.');
    if (taken.some((t) => same(t, clean))) return setNote(`${clean} is already on the list.`);
    onAdd(clean);
    setName('');
    setNote(`✓ Added ${clean}. Add another or tap Done.`);
  };

  return (
    <DuezyModal title="Add a player" onClose={onClose} className="dz-join-player-modal">
      <form className="dz-stack" onSubmit={add} noValidate>
        <label className="dz-field">
          <span>Player name</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setNote(''); }} maxLength={60} autoComplete="off" autoFocus />
        </label>
        {note ? <p className="dz-small dz-muted" role="status">{note}</p> : null}
        <div className="dz-row dz-join-player-actions">
          <button type="submit" className="dz-btn dz-btn--primary">Add player</button>
          <button type="button" className="dz-btn dz-btn--ghost" onClick={onClose}>Done</button>
        </div>
      </form>
    </DuezyModal>
  );
}
