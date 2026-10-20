import React, { useState } from 'react';
import { canAdd, isDone, loadTrack, saveTrack, statusText, step, trackRule } from './showdownScoreTrack.js';
import './ShowdownScoreTracker.css';

function Side({ name, score, onAdd, onRemove, addOk }) {
  return (
    <div className="sd-track-side">
      <span className="sd-track-name">{name}</span>
      <strong className="sd-track-score" aria-live="polite">{score}</strong>
      <button type="button" className="sd-track-add" disabled={!addOk} onClick={onAdd} aria-label={`Add a game for ${name}`}>+</button>
      <button type="button" className="sd-track-remove" disabled={score === 0} onClick={onRemove} aria-label={`Take a game away from ${name}`}>&minus;</button>
    </div>
  );
}

/** Keep score game by game on the phone, then send the final score to the director. */
export default function ShowdownScoreTracker({ event, match, reporterName = '', onSend, onCancel }) {
  const rule = trackRule(event, match);
  const [score, setScore] = useState(() => loadTrack(event.id, match.id) || { s1: 0, s2: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const done = isDone(rule, score.s1, score.s2);
  const addOk = canAdd(rule, score.s1, score.s2);

  const change = (side, delta) => {
    setScore((prev) => {
      const next = step(rule, prev, side, delta);
      saveTrack(event.id, match.id, next);
      return next;
    });
    setError('');
  };

  const send = async () => {
    setBusy(true);
    setError('');
    const problem = await onSend(score.s1, score.s2, reporterName);
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <div className="cc-modal-overlay" role="presentation" onClick={onCancel}>
      <div className="cc-modal sd-score-modal sd-track" role="dialog" aria-modal="true" aria-labelledby="sd-track-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="sd-track-title">Keep score{' \u00b7 '}{match.label}</h2>
        <p className="sd-track-status">{statusText(rule, score.s1, score.s2)}</p>
        <p className="sd-note">
          {rule.mode === 'games' ? `${rule.target} games, all played. A tie is allowed.` : `First to ${rule.target} games wins.`}
          {' '}Tap + after each game. The score is saved on this phone.
        </p>
        <div className="sd-track-board">
          <Side name={match.p1Name} score={score.s1} addOk={addOk} onAdd={() => change(1, 1)} onRemove={() => change(1, -1)} />
          <Side name={match.p2Name} score={score.s2} addOk={addOk} onAdd={() => change(2, 1)} onRemove={() => change(2, -1)} />
        </div>
        {done ? <p className="sd-ok">Final: {match.p1Name} {score.s1}&ndash;{score.s2} {match.p2Name}. Send it when you both agree.</p> : null}
        {done && reporterName ? <p className="sd-note">Sending as <strong>{reporterName}</strong></p> : null}
        <p className="sd-note">The director confirms every score before standings or money change.</p>
        {error ? <p className="sd-error" role="alert">{error}</p> : null}
        <div className="sd-modal-actions">
          <button type="button" className="tb-btn-new" onClick={onCancel}>Close</button>
          <button type="button" className="sd-btn sd-btn-primary" disabled={!done || busy} onClick={send}>{busy ? 'Sending\u2026' : 'Send to director'}</button>
        </div>
      </div>
    </div>
  );
}
