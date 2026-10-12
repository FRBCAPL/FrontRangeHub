import React, { useState } from 'react';

/** "Move to division…" — payments stay with the team; dues follow the new division. */
export default function DuezyMoveTeam({ team, divisions, onMove }) {
  const others = divisions.filter((d) => d.id !== team.division_id);
  const [target, setTarget] = useState(others[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  if (!others.length) return null;
  if (!open) {
    return <button type="button" className="dz-link dz-small" onClick={() => setOpen(true)}>Move to division…</button>;
  }

  const move = async () => {
    setBusy(true);
    try {
      await onMove({ division_id: target });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dz-inline-form">
      <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Move to division">
        {others.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={move} disabled={busy || !target}>Move</button>
      <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => setOpen(false)}>Cancel</button>
      <p className="dz-small dz-muted dz-full">Past payments move with the team. What they owe follows the new division's dues.</p>
    </div>
  );
}
