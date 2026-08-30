import React, { useState } from 'react';
import { openPendingSubmissions, pendingApprovalLabel, findMatchById, matchWithPendingDraft } from './cashClimbSubmit.js';
import { raceToForMatch } from './cashClimbRace.js';
import CashClimbPendingModal from './CashClimbPendingModal.jsx';
import CashClimbResultModal from './CashClimbResultModal.jsx';
import './CashClimbPendingQueue.css';

export default function CashClimbPendingQueue({ tournament, submissions, onConfirm, onReject }) {
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const rows = openPendingSubmissions(tournament, submissions);
  if (!rows.length) return null;
  const draft = editRow ? matchWithPendingDraft(findMatchById(tournament, editRow.match_id), editRow) : null;

  return (
    <>
      <button
        type="button"
        className="cc-pending-banner"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>Waiting on you</span>
        <strong>{pendingApprovalLabel(rows.length)}</strong>
      </button>
      {open && (!editRow || !draft) && (
        <CashClimbPendingModal
          tournament={tournament}
          rows={rows}
          onConfirm={onConfirm}
          onEdit={setEditRow}
          onReject={onReject}
          onClose={() => setOpen(false)}
        />
      )}
      {open && draft && (
        <CashClimbResultModal
          match={draft}
          raceTo={raceToForMatch(tournament, draft)}
          title="Edit submitted result"
          submitLabel="Save and post"
          onCancel={() => setEditRow(null)}
          onSubmit={(winnerId, score, extras) => {
            const posted = onConfirm({
              ...editRow,
              winner_id: winnerId,
              score,
              game_type: extras?.playedGame || '',
            });
            if (posted !== false) setEditRow(null);
          }}
        />
      )}
    </>
  );
}
