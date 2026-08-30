import React from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { pendingWinnerName } from './cashClimbSubmit.js';
import './CashClimbPendingQueue.css';

export default function CashClimbPendingQueue({ tournament, submissions, onConfirm, onReject }) {
  const open = (submissions || []).filter((row) => {
    const match = (tournament?.matches || []).find((m) => m.id === row.match_id);
    return match && match.status === 'pending' && !match.is_bye;
  });
  if (!open.length) return null;

  return (
    <section className="cc-pending-queue" aria-label="Player submissions">
      <h2>Waiting on you</h2>
      <p className="cc-meta">Players sent these from their phones. Confirm before money posts.</p>
      <ul>
        {open.map((row) => {
          const match = tournament.matches.find((m) => m.id === row.match_id);
          const winner = pendingWinnerName(match, row);
          return (
            <li key={row.id || row.match_id}>
              <div>
                <strong>{match.player1_name} vs {match.player2_name}</strong>
                <span>
                  {winner ? `${winner} wins` : 'Winner picked'}
                  {row.score ? ` • ${row.score}` : ''}
                  {row.submitted_by ? ` • from ${row.submitted_by}` : ''}
                </span>
                <small>Pays {formatMoney(match.payout_amount)}</small>
              </div>
              <div className="cc-pending-queue-actions">
                <button type="button" className="btn-primary" onClick={() => onConfirm(row)}>
                  Confirm
                </button>
                <button type="button" className="btn-secondary" onClick={() => onReject(row)}>
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
