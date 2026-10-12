import React, { useState } from 'react';

export default function DuezyTeamEditForm({ team, onSave, onCancel }) {
  const [name, setName] = useState(team.name);
  const [captain, setCaptain] = useState(team.captain || '');
  const [contact, setContact] = useState(team.contact || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave({ name: name.trim(), captain: captain.trim() || null, contact: contact.trim() || null });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dz-inline-form">
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Team name" />
      <input value={captain} onChange={(e) => setCaptain(e.target.value)} placeholder="Captain (optional)" maxLength={80} aria-label="Captain" />
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Captain phone or email"
        maxLength={120}
        aria-label="Captain phone or email"
      />
      <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={save} disabled={busy}>Save</button>
      <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={onCancel}>Cancel</button>
    </div>
  );
}
