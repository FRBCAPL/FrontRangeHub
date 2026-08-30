import React from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { findMatchById, pendingWinnerName } from './cashClimbSubmit.js';
import './CashClimbPendingQueue.css';

export default function CashClimbPendingQueue({ tournament, submissions, onConfirm, onReject }) {
  const open = (submissions || []).filter((row) => {
    const match = findMatchById(tournament, row.match_id);
    return match && match.status === 'pending' && !match.is_bye;
  });
  if (!open.length) return null;

  return (
    <section className="cc-pending-queue" aria-label="Player submissions">
      <h2>Waiting on you</h2>
      <p className="cc-meta">Tap Confirm to post money. Players cannot continue the round.</p>
      <ul>
        {open.map((row) => {
          const match = findMatchById(tournament, row.match_id);
          const winner = pendingWinnerName(match, row);
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
                  {row.submitted_by ? ` • from ${row.submitted_by}` : ''}
                </span>
                <small>Pays {formatMoney(match.payout_amount)}</small>
                <em>Confirm this result</em>
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
    </section>
  );
}
