import React, { useState } from 'react';

export default function DuezyAddTeam({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [captain, setCaptain] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) {
    return (
      <button type="button" className="dz-link dz-add-team" onClick={() => setOpen(true)}>+ Add a team</button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onAdd({ name, captain, contact });
      setName('');
      setCaptain('');
      setContact('');
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="dz-inline-form dz-add-team" onSubmit={submit}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" maxLength={80} autoFocus />
      <input value={captain} onChange={(e) => setCaptain(e.target.value)} placeholder="Captain (optional)" maxLength={80} />
      <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Captain phone or email" maxLength={120} />
      <button type="submit" className="dz-btn dz-btn--primary dz-btn--sm" disabled={busy || !name.trim()}>Add</button>
      <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setOpen(false)}>Cancel</button>
      {error ? <p className="dz-error">{error}</p> : null}
    </form>
  );
}
