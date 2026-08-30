import React, { useEffect, useRef, useState } from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { validateRecordedGames } from './cashClimbScore.js';

export default function CashClimbResultModal({
  match,
  raceTo,
  onSubmit,
  onCancel,
  title,
  submitLabel,
}) {
  const editing = match?.status === 'completed';
  const [winnerId, setWinnerId] = useState(match?.winner_id || '');
  const [recordScore, setRecordScore] = useState(Boolean(match?.score));
  const [p1Games, setP1Games] = useState('');
  const [p2Games, setP2Games] = useState('');
  const [error, setError] = useState('');
  const firstPick = useRef(null);

  useEffect(() => {
    const scoreParts = String(match?.score || '').split(/\s*[-–]\s*/);
    setWinnerId(match?.winner_id || '');
    setRecordScore(Boolean(match?.score));
    setP1Games(scoreParts.length === 2 ? scoreParts[0] : '');
    setP2Games(scoreParts.length === 2 ? scoreParts[1] : '');
    setError('');
    firstPick.current?.focus();
  }, [match?.id, match?.winner_id, match?.score]);

  if (!match) return null;
  const race = Math.max(1, Number(raceTo) || 0);

  const parsed = validateRecordedGames(
    recordScore ? p1Games : '',
    recordScore ? p2Games : '',
    {
      raceTo,
      winnerId,
      player1Id: match.player1_id,
      player2Id: match.player2_id,
    }
  );
  const liveError = recordScore && (p1Games !== '' || p2Games !== '') && !parsed.ok ? parsed.error : '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!winnerId) {
      setError('Pick a winner.');
      return;
    }
    if (recordScore && parsed.score == null) {
      setError('Enter both game counts, or turn off Record game score.');
      return;
    }
    if (recordScore && !parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError('');
    onSubmit(winnerId, recordScore ? parsed.score : null);
  };

  return (
    <div className="cc-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="cc-result-title">
      <form className="cc-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 id="cc-result-title">{title || (editing ? 'Edit result' : 'Enter result')}</h3>
        <p className="cc-modal-meta">
          Round {match.round_number} • Match {match.match_number}
          {race ? ` • ${race === 1 ? '1 game' : `Race to ${race}`}` : ''}
          {' '}• Win pays {formatMoney(match.payout_amount)}
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

        <label className="cc-score-toggle">
          <input
            type="checkbox"
            checked={recordScore}
            onChange={(e) => {
              setRecordScore(e.target.checked);
              setError('');
              if (!e.target.checked) {
                setP1Games('');
                setP2Games('');
              }
            }}
          />
          Record game score
        </label>

        {recordScore ? (
          <div className="cc-score-fields">
            <label>
              {match.player1_name} games
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max={race || undefined}
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
                max={race || undefined}
                value={p2Games}
                onChange={(e) => {
                  setP2Games(e.target.value);
                  setError('');
                }}
              />
            </label>
          </div>
        ) : (
          <p className="cc-score-hint">No score recorded. Winner only.</p>
        )}

        {recordScore && race === 1 ? (
          <p className="cc-score-hint">1 game: the winner has 1, the other player 0.</p>
        ) : recordScore && race ? (
          <p className="cc-score-hint">
            Race to {race}: the winner must have {race} games, the other player 0–{race - 1}.
          </p>
        ) : null}

        {(error || liveError) && (
          <p className="cc-field-error" role="alert">{error || liveError}</p>
        )}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {submitLabel || (editing ? 'Save changes' : 'Save result')}
          </button>
        </div>
      </form>
    </div>
  );
}
