import React, { useState } from 'react';

function Picker({ name, value, raceTo, onPick }) {
  return (
    <div className="sd-score-row">
      <span className="sd-score-name">{name}</span>
      <div className="sd-score-btns" role="group" aria-label={`${name} games`}>
        {Array.from({ length: raceTo + 1 }, (_, n) => (
          <button key={n} type="button" className={`sd-score-btn${value === n ? ' is-on' : ''}`} aria-pressed={value === n} onClick={() => onPick(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

/** Phone score entry. Sending only asks the director; nothing changes until they approve. */
export default function ShowdownPhoneScoreModal({ match, raceTo, onSend, onCancel }) {
  const [s1, setS1] = useState(null);
  const [s2, setS2] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = s1 !== null && s2 !== null && ((s1 === raceTo) !== (s2 === raceTo));

  const send = async () => {
    setBusy(true);
    setError('');
    const problem = await onSend(s1, s2, name);
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <div className="cc-modal-overlay" role="presentation" onClick={onCancel}>
      <div className="cc-modal sd-score-modal" role="dialog" aria-modal="true" aria-labelledby="sd-phone-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="sd-phone-title">Report score{' \u00b7 '}{match.label}</h2>
        <p className="sd-note">Race to {raceTo}. The director confirms every score before standings or money change.</p>
        <Picker name={match.p1Name} value={s1} raceTo={raceTo} onPick={setS1} />
        <Picker name={match.p2Name} value={s2} raceTo={raceTo} onPick={setS2} />
        {s1 !== null && s2 !== null && !valid ? <p className="sd-error">One player must have exactly {raceTo} and the other fewer.</p> : null}
        <label className="sd-field">
          <span>Your name (optional)</span>
          <input className="sd-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </label>
        {error ? <p className="sd-error" role="alert">{error}</p> : null}
        <div className="sd-modal-actions">
          <button type="button" className="tb-btn-new" onClick={onCancel}>Cancel</button>
          <button type="button" className="sd-btn sd-btn-primary" disabled={!valid || busy} onClick={send}>{busy ? 'Sending\u2026' : 'Send to director'}</button>
        </div>
      </div>
    </div>
  );
}
