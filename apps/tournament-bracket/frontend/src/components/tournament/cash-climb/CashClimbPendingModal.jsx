import React from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { findMatchById, pendingWinnerName } from './cashClimbSubmit.js';
import { pendingSubmitterName, playedGameFromPending } from './cashClimbPlayedGame.js';

export default function CashClimbPendingModal({ tournament, rows, onConfirm, onEdit, onReject, onClose }) {
  return (
    <div className="cc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cc-pending-title">
      <div className="cc-modal cc-pending-modal" onClick={(e) => e.stopPropagation()}>
        <header className="cc-pending-modal-head">
          <p className="cc-play-kicker">Cash Climb</p>
          <h3 id="cc-pending-title">Awaiting approval</h3>
          <p className="cc-modal-meta">Confirm to post as submitted, or edit first. Players cannot continue the round.</p>
        </header>
        <ul className="cc-pending-modal-list">
          {rows.map((row) => {
            const match = findMatchById(tournament, row.match_id);
            if (!match) return null;
            const winner = pendingWinnerName(match, row);
            const game = playedGameFromPending(row);
            const from = pendingSubmitterName(row);
            return (
              <li key={row.id || row.match_id}>
                <button
                  type="button"
                  className="cc-pending-confirm"
                  onClick={() => onConfirm(row)}
                >
                  <strong>{match.player1_name} vs {match.player2_name}</strong>
                  <span>
                    {winner ? `${winner} wins` : 'Winner picked'}
                    {row.score ? ` • ${row.score}` : ''}
                    {game ? ` • ${game}` : ''}
                    {from ? ` • from ${from}` : ''}
                  </span>
                  <small>Pays {formatMoney(match.payout_amount)}</small>
                  <em>Confirm this result</em>
                </button>
                <button
                  type="button"
                  className="cc-pending-edit"
                  onClick={() => onEdit(row)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="cc-pending-reject"
                  onClick={() => onReject(row)}
                >
                  Reject
                </button>
              </li>
            );
          })}
        </ul>
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
