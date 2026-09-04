import React, { useState } from 'react';
import { applyUsaplRosterToDuezy } from '../../services/usaplDuezyApply.js';

function buttonLabel(mode) {
  if (mode === 'add') return 'Add player in Duezy';
  if (mode === 'new' || mode === 'full') return 'Save names in Duezy';
  return 'Update this team in Duezy';
}

export default function UsaplInboxDuezyButton({ roster, onDone }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async () => {
    setBusy(true);
    setMessage('');
    try {
      await applyUsaplRosterToDuezy(roster.id);
      setConfirming(false);
      onDone();
    } catch (err) {
      setMessage(err?.message || 'Could not update Duezy.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {confirming ? (
        <>
          <p className="usapl-note">
            This changes names on {roster.team_name} in Duezy. Weekly payments and dues totals stay as they are.
          </p>
          <div className="usapl-actions" style={{ marginTop: 8 }}>
            <button className="usapl-btn" type="button" disabled={busy} onClick={run}>
              {busy ? 'Updating Duezy…' : 'Confirm Duezy update'}
            </button>
            <button className="usapl-btn-secondary" type="button" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <button className="usapl-btn" type="button" onClick={() => setConfirming(true)}>
          {buttonLabel(roster.mode)}
        </button>
      )}
      {message ? <div className="usapl-error" style={{ marginTop: 8 }}>{message}</div> : null}
    </div>
  );
}
