import React, { useState } from 'react';
import { findElimMatch } from './elimMatches.js';
import { pendingWinnerName } from './elimSubmit.js';
import './cash-climb/CashClimbPendingQueue.css';

export default function ElimPendingQueue({ tournament, submissions, onConfirm, onReject }) {
  const [open, setOpen] = useState(false);
  const rows = (submissions || []).filter((row) => findElimMatch(tournament, row.match_id));
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
        <strong>{rows.length === 1 ? '1 result to confirm' : `${rows.length} results to confirm`}</strong>
      </button>
      {open ? (
        <div className="cc-modal-overlay" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-labelledby="elim-pending-title">
          <div className="cc-modal cc-pending-modal" onClick={(e) => e.stopPropagation()}>
            <header className="cc-pending-modal-head">
              <p className="cc-play-kicker">Elimination</p>
              <h3 id="elim-pending-title">Awaiting approval</h3>
              <p className="cc-modal-meta">Confirm to advance the bracket, or reject if it is wrong.</p>
            </header>
            <ul className="cc-pending-modal-list">
              {rows.map((row) => {
                const match = findElimMatch(tournament, row.match_id);
                if (!match) return null;
                const winner = pendingWinnerName(match, row);
                return (
                  <li key={row.id || row.match_id}>
                    <button type="button" className="cc-pending-confirm" onClick={() => onConfirm(row)}>
                      <strong>{match.player1_name} vs {match.player2_name}</strong>
                      <span>{winner ? `${winner} wins` : 'Winner picked'}{row.score ? ` • ${row.score}` : ''}{row.submitted_by ? ` • from ${row.submitted_by}` : ''}</span>
                      <small>{[match.bracket, match.round_name].filter(Boolean).join(' • ')}</small>
                      <em>Confirm this result</em>
                    </button>
                    <button type="button" className="cc-pending-reject" onClick={() => onReject(row)}>
                      Reject
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="form-actions">
              <button type="button" className="btn-primary" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
