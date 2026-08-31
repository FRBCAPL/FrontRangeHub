import React from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { finishPlaceLabel } from './cashClimbPlacePrizes.js';
import { playerMatchHistory } from './cashClimbPlayerHistory.js';
import WinLoss from './WinLoss.jsx';
import './CashClimbPlayerHistoryModal.css';

function tag(player) {
  if (player.chopped) return 'Chop';
  if (player.finish_place) return finishPlaceLabel(player.finish_place);
  if (player.eliminated) return 'Out';
  if (player.in_koh) return 'KOH';
  return 'In';
}

export default function CashClimbPlayerHistoryModal({ tournament, player, onClose }) {
  if (!player) return null;
  const rows = playerMatchHistory(tournament, player.player_id);

  return (
    <div className="cc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cc-history-title">
      <div className="cc-modal cc-history-modal" onClick={(e) => e.stopPropagation()}>
        <header className="cc-history-head">
          <p className="cc-play-kicker">Cash Climb</p>
          <div className="cc-history-name">
            <h3 id="cc-history-title">{player.player_name}</h3>
            <span className="cc-history-status">{tag(player)}</span>
          </div>
          <p className="cc-history-record">
            <WinLoss wins={player.wins} losses={player.losses} />
            {player.in_koh || player.koh_wins || player.koh_losses ? (
              <>
                {' • KOH '}
                <WinLoss wins={player.koh_wins} losses={player.koh_losses} />
              </>
            ) : null}
          </p>
          <p className="cc-history-earned">{formatMoney(player.total_payout)}</p>
        </header>
        {rows.length ? (
          <ul className="cc-history-list">
            {rows.map((row) => (
              <li key={row.id} className={`cc-history-row is-${row.result.toLowerCase()}`}>
                <strong>{row.roundLabel}</strong>
                <span>
                  {row.result === 'Bye' ? 'Bye' : `${row.result} vs ${row.opponent}`}
                  {row.score ? ` • ${row.score}` : ''}
                </span>
                <small>{row.paid ? formatMoney(row.paid) : '—'}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="cc-meta">No posted matches yet.</p>
        )}
        <div className="form-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
