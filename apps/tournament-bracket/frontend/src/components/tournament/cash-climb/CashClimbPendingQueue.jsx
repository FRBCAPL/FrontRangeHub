import React, { useState } from 'react';
import { openPendingSubmissions, pendingApprovalLabel } from './cashClimbSubmit.js';
import CashClimbPendingModal from './CashClimbPendingModal.jsx';
import './CashClimbPendingQueue.css';

export default function CashClimbPendingQueue({ tournament, submissions, onConfirm, onReject }) {
  const [open, setOpen] = useState(false);
  const rows = openPendingSubmissions(tournament, submissions);
  if (!rows.length) return null;

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
      {open && (
        <CashClimbPendingModal
          tournament={tournament}
          rows={rows}
          onConfirm={onConfirm}
          onReject={onReject}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
