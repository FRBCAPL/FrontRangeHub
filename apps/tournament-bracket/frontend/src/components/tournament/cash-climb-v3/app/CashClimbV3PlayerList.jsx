import React from 'react';

const detailLine = (p) => [
  p.league,
  p.rank ? `Rank ${p.rank}` : '',
  p.fargorate ? `Fargo ${p.fargorate}` : '',
  p.email,
].filter(Boolean).join(' \u00b7 ');

/** Setup player list. Tapping a player opens Edit Player (`onEdit`); × removes them. */
export default function CashClimbV3PlayerList({ players, onEdit, onRemove }) {
  if (!players.length) return null;
  return (
    <ul className="players-list">
      {players.map((p) => {
        const details = detailLine(p);
        return (
          <li key={p.id} className="player-list-item">
            <button type="button" className="player-list-name ccv3-player-name" onClick={() => onEdit(p)} aria-label={`Edit ${p.name}`}>
              <span className="ccv3-player-main">
                {p.name}
                <span className="ccv3-player-pencil" aria-hidden="true">{'\u270e'}</span>
              </span>
              {details ? <span className="player-list-detail">{details}</span> : null}
            </button>
            <button type="button" className="player-list-remove" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`}>&times;</button>
          </li>
        );
      })}
    </ul>
  );
}
