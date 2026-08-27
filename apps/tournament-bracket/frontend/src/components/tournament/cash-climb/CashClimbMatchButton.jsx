import React from 'react';
import { formatMoney } from './cashClimbEngine.js';

export default function CashClimbMatchButton({ match, tableLabel, onPick, onDeck = false }) {
  return (
    <li>
      <button
        type="button"
        className={`cc-match${onDeck ? ' is-deck' : ''}`}
        onClick={() => onPick(match)}
      >
        <span className="cc-match-table">{tableLabel}</span>
        <span>{match.player1_name}</span>
        <em>vs</em>
        <span>{match.player2_name || 'Bye'}</span>
        <small>{formatMoney(match.payout_amount)}</small>
      </button>
    </li>
  );
}
