import React, { useState } from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { parseOptionalMatchScore } from './cashClimbScore.js';

export default function CashClimbResultModal({ match, raceTo, onSubmit, onCancel }) {
  const [winnerId, setWinnerId] = useState('');
  const [score, setScore] = useState('');
  const [error, setError] = useState('');

  if (!match) return null;

  const placeholder = raceTo ? `${raceTo}-${Math.max(0, raceTo - 2)}` : '5-3';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!winnerId) {
      setError('Pick a winner.');
      return;
    }
    const parsed = parseOptionalMatchScore(score, {
      raceTo,
      winnerId,
      player1Id: match.player1_id,
      player2Id: match.player2_id,
    });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError('');
    onSubmit(winnerId, parsed.score);
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
            onChange={() => {
              setWinnerId(match.player1_id);
              setError('');
            }}
          />
          {match.player1_name}
        </label>
        <label className="cc-winner-pick">
          <input
            type="radio"
            name="winner"
            checked={winnerId === match.player2_id}
            onChange={() => {
              setWinnerId(match.player2_id);
              setError('');
            }}
          />
          {match.player2_name}
        </label>
        <label>
          Score (optional)
          <input
            value={score}
            onChange={(e) => {
              setScore(e.target.value);
              setError('');
            }}
            placeholder={placeholder}
            aria-invalid={Boolean(error && score.trim())}
          />
        </label>
        <p className="cc-score-hint">
          Leave blank if you are not recording games. If entered, use {match.player1_name} then {match.player2_name}, and the winner must reach {raceTo || 'the race-to'}.
        </p>
        {error && <p className="cc-field-error" role="alert">{error}</p>}
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
