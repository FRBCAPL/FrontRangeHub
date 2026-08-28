import React from 'react';
import { formatMoney } from './cashClimbEngine.js';

export default function CashClimbMatchButton({ match, tableLabel, onPick, onDeck = false }) {
  const bye = Boolean(match.is_bye) || !match.player2_id;
  const done = match.status === 'completed';
  const className = `cc-match${onDeck ? ' is-deck' : ''}${done && !bye ? ' is-done' : ''}${bye ? ' is-bye' : ''}`;
  const body = (
    <>
      <span className="cc-match-table">{bye ? 'Bye' : done ? 'Edit' : tableLabel}</span>
      <span>{match.player1_name}{(done || bye) && match.winner_id === match.player1_id ? ' ✓' : ''}</span>
      <em>vs</em>
      <span>{match.player2_name || 'Bye'}{done && match.winner_id === match.player2_id ? ' ✓' : ''}</span>
      <small>
        {done && match.score ? `${match.score} • ` : ''}
        {formatMoney(match.payout_amount)}
      </small>
    </>
  );

  return (
    <li>
      {bye ? (
        <div className={className} aria-label={`${match.player1_name} bye`}>
          {body}
        </div>
      ) : (
        <button
          type="button"
          className={className}
          onClick={() => onPick(match)}
        >
          {body}
        </button>
      )}
    </li>
  );
}
