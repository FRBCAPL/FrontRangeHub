import React, { useState } from 'react';
import { v3ScoreProblem } from '../../operator/v3/showdownV3ScoreDraft.js';
import { v3PhoneLimits, v3PhoneRuleText } from './showdownV3PhoneRules.js';

function Picker({ name, value, max, onPick }) {
  return (
    <div className="sd-score-row">
      <span className="sd-score-name">{name}</span>
      <div className="sd-score-btns" role="group" aria-label={`${name} games won`}>
        {Array.from({ length: max + 1 }, (_, n) => (
          <button key={n} type="button" className={`sd-score-btn${value === n ? ' is-on' : ''}`} aria-pressed={value === n} onClick={() => onPick(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

/** V3 phone score entry. Sending only asks the director; nothing changes until they approve. */
export default function ShowdownV3PhoneScoreModal({ event, match, reporterName = '', onSend, onCancel }) {
  const limits = v3PhoneLimits(event, match);
  const qualifying = limits.phase === 'qualifying';
  const max = qualifying ? limits.games : limits.raceTo;
  const [s1, setS1] = useState(null);
  const [s2, setS2] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pick1 = (n) => { setS1(n); if (qualifying) setS2(limits.games - n); };
  const pick2 = (n) => { setS2(n); if (qualifying) setS1(limits.games - n); };
  const problem = v3ScoreProblem(limits, s1, s2);
  const tie = !problem && qualifying && s1 === s2;

  const send = async () => {
    setBusy(true);
    setError('');
    const out = await onSend(s1, s2, name);
    setBusy(false);
    if (out) setError(out);
  };

  return (
    <div className="cc-modal-overlay" role="presentation" onClick={onCancel}>
      <div className="cc-modal sd-score-modal" role="dialog" aria-modal="true" aria-labelledby="sd-phone-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="sd-phone-title">Report score{' \u00b7 '}{match.label}</h2>
        <p className="sd-note"><strong>{qualifying ? `${limits.games} games` : `Race to ${limits.raceTo}`}</strong>{' \u00b7 '}{v3PhoneRuleText(limits)}</p>
        <p className="sd-note">The director confirms every score before standings or money change.</p>
        <Picker name={match.p1Name} value={s1} max={max} onPick={pick1} />
        <Picker name={match.p2Name} value={s2} max={max} onPick={pick2} />
        {s1 !== null && s2 !== null && problem ? <p className="sd-error">{problem}</p> : null}
        {tie ? <p className="sd-ok">Tie: {s1}&ndash;{s2}. Both players are paid for the games they won.</p> : null}
        {reporterName ? <p className="sd-note">Sending as <strong>{reporterName}</strong></p> : (
          <label className="sd-field">
            <span>Your name (optional)</span>
            <input className="sd-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        {error ? <p className="sd-error" role="alert">{error}</p> : null}
        <div className="sd-modal-actions">
          <button type="button" className="tb-btn-new" onClick={onCancel}>Cancel</button>
          <button type="button" className="sd-btn sd-btn-primary" disabled={Boolean(problem) || busy} onClick={send}>{busy ? 'Sending\u2026' : 'Send to director'}</button>
        </div>
      </div>
    </div>
  );
}
