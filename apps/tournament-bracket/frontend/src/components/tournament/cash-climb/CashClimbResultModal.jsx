import React, { useState } from 'react';
import { formatMoney } from './cashClimbEngine.js';

export default function CashClimbResultModal({ match, raceTo, onSubmit, onCancel }) {
  const [winnerId, setWinnerId] = useState('');
  const [score, setScore] = useState('');

  if (!match) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!winnerId) {
      alert('Pick a winner.');
      return;
    }
    onSubmit(winnerId, score.trim() || null);
  };

  return (
    <div className="cc-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <form className="cc-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>Enter result</h3>
        <p className="cc-modal-meta">
          Round {match.round_number} • Match {match.match_number}
          {raceTo ? ` • Race to ${raceTo}` : ''}
          {' '}• Win pays {formatMoney(match.payout_amount)}
        </p>
        <label className="cc-winner-pick">
          <input
            type="radio"
            name="winner"
            checked={winnerId === match.player1_id}
            onChange={() => setWinnerId(match.player1_id)}
          />
          {match.player1_name}
        </label>
        <label className="cc-winner-pick">
          <input
            type="radio"
            name="winner"
            checked={winnerId === match.player2_id}
            onChange={() => setWinnerId(match.player2_id)}
          />
          {match.player2_name}
        </label>
        <label>
          Score (optional)
          <input
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder={raceTo ? `${raceTo}-${Math.max(0, raceTo - 2)}` : '5-3'}
          />
        </label>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save result
          </button>
        </div>
      </form>
    </div>
  );
}
