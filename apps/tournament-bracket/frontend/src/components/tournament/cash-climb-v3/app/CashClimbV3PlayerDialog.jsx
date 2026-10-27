import React, { useState } from 'react';
import CashClimbV3Dialog from './CashClimbV3Dialog.jsx';

const FIELDS = [
  { key: 'email', label: 'Email', type: 'email', placeholder: 'email@example.com' },
  { key: 'league', label: 'League', placeholder: 'e.g. Front Range BCA' },
  { key: 'rank', label: 'Rank', placeholder: 'e.g. A, B, C or 500' },
  { key: 'fargorate', label: 'FargoRate', placeholder: 'e.g. 550' },
];

/**
 * Edit a player before the tournament starts: name and the optional details from Add Player. The id
 * stays the same, so the draw does not change. `others`: the rest of the players, to refuse duplicates.
 */
export default function CashClimbV3PlayerDialog({ player, others, onSave, onRemove, onClose }) {
  const [form, setForm] = useState(() => ({
    name: player.name || '', ...Object.fromEntries(FIELDS.map((f) => [f.key, player[f.key] || ''])),
  }));
  const [error, setError] = useState('');
  const set = (key) => (e) => { setForm({ ...form, [key]: e.target.value }); setError(''); };

  const submit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setError('Enter a name.'); return; }
    if (others.some((p) => p.name.trim().toLowerCase() === name.toLowerCase())) { setError(`${name} is already entered.`); return; }
    onSave({ ...player, ...Object.fromEntries(FIELDS.map((f) => [f.key, form[f.key].trim()])), name });
  };

  return (
    <CashClimbV3Dialog title={`Edit ${player.name}`} onClose={onClose}>
      <form className="add-player-modal-form ccv3-player-form" onSubmit={submit}>
        <label>
          Name <span className="required">*</span>
          <input type="text" value={form.name} onChange={set('name')} placeholder="Player name" autoFocus />
        </label>
        {FIELDS.map((f) => (
          <label key={f.key}>
            {f.label}
            <input type={f.type || 'text'} value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder} />
          </label>
        ))}
        {error ? <p className="ccv3-problems" role="alert">{error}</p> : null}
        <div className="add-player-modal-actions ccv3-player-actions">
          <button type="button" className="ccv3-player-remove" onClick={onRemove}>Remove player</button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save changes</button>
        </div>
      </form>
    </CashClimbV3Dialog>
  );
}
