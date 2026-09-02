import React, { useEffect, useRef, useState } from 'react';
import { parseElimScore } from './elimScore.js';
import './cash-climb/CashClimb.css';
import './ElimWinnerModal.css';

export default function ElimWinnerModal({
  match,
  onSubmit,
  onCancel,
  title = 'Enter result',
  submitLabel = 'Save result',
  note = '',
}) {
  const [winnerId, setWinnerId] = useState('');
  const [p1Games, setP1Games] = useState('');
  const [p2Games, setP2Games] = useState('');
  const [error, setError] = useState('');
  const firstPick = useRef(null);

  useEffect(() => {
    const parts = String(match?.score || '').split(/\s*[-–]\s*/);
    setWinnerId(match?.preferredWinner || match?.winner || match?.winner_id || '');
    setP1Games(parts.length === 2 ? parts[0] : '');
    setP2Games(parts.length === 2 ? parts[1] : '');
    setError('');
    firstPick.current?.focus();
  }, [match?.id, match?.score, match?.winner, match?.winner_id, match?.preferredWinner]);

  if (!match) return null;

  const parsed = parseElimScore(p1Games, p2Games, winnerId, match.player1_id, match.player2_id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!winnerId) {
      setError('Pick a winner.');
      return;
    }
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    onSubmit(winnerId, parsed.score);
  };

  return (
    <div className="cc-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="elim-result-title">
      <form className="cc-modal elim-result-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 id="elim-result-title">{title}</h3>
        <p className="cc-modal-meta">
          {[match.bracket, match.round_name].filter(Boolean).join(' • ') || 'Match'}
        </p>
        <label className="cc-winner-pick">
          <input
            ref={firstPick}
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

        <div className="cc-score-fields">
          <label>
            {match.player1_name} games
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={p1Games}
              onChange={(e) => {
                setP1Games(e.target.value);
                setError('');
              }}
            />
          </label>
          <label>
            {match.player2_name} games
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={p2Games}
              onChange={(e) => {
                setP2Games(e.target.value);
                setError('');
              }}
            />
          </label>
        </div>
        <p className="cc-score-hint">Enter the games each player won, like 7 and 5.</p>
        {note ? <p className="cc-score-hint">{note}</p> : null}
        {error ? <p className="cc-field-error" role="alert">{error}</p> : null}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
