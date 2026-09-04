import React, { useEffect, useState } from 'react';
import { usaplPersonName } from '../../data/usaplContact.js';
import { usaplRosterModeLabel } from '../../data/usaplRosterSteps.js';
import UsaplInboxRosterDetail from './UsaplInboxRosterDetail.jsx';

export default function UsaplInboxSavedRosters({ rows, divisions }) {
  const [openId, setOpenId] = useState(null);
  const open = rows.find((row) => row.id === openId) || null;

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') setOpenId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!rows.length) return <p>No roster edits have been saved in Duezy yet.</p>;

  return (
    <>
      {rows.map((row) => (
        <section className="usapl-card" key={row.id} style={{ marginBottom: 12 }}>
          <h2>{row.team_name}</h2>
          <p className="usapl-meta">
            {usaplRosterModeLabel(row.mode)}
            {' · '}
            {usaplPersonName(row.captain) || 'No captain name'}
            {' · '}
            {(row.players || []).length + (row.captain ? 1 : 0)} players
            {row.created_at ? ` · ${new Date(row.created_at).toLocaleString()}` : ''}
          </p>
          <div className="usapl-actions" style={{ marginTop: 8 }}>
            <button className="usapl-btn" type="button" onClick={() => setOpenId(row.id)}>
              Open saved roster
            </button>
          </div>
        </section>
      ))}

      {open ? (
        <div className="usapl-modal-backdrop usapl-signup-backdrop" role="presentation" onClick={() => setOpenId(null)}>
          <div
            className="usapl-modal usapl-signup-modal"
            style={{ overflow: 'auto' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="usapl-saved-roster-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="usapl-signup-phase">Saved in Duezy</p>
            <h2 id="usapl-saved-roster-title">{open.team_name}</h2>
            <UsaplInboxRosterDetail row={open} divisions={divisions} />
            <div className="usapl-actions">
              <button className="usapl-btn" type="button" onClick={() => setOpenId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
