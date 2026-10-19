import React, { useState } from 'react';

function ScoreRow({ name, value, raceTo, onPick }) {
  const options = Array.from({ length: raceTo + 1 }, (_, i) => i);
  return (
    <div className="sd-score-row">
      <span className="sd-score-name">{name}</span>
      <div className="sd-score-btns" role="group" aria-label={`${name} games`}>
        {options.map((n) => (
          <button key={n} type="button" className={`sd-score-btn${value === n ? ' is-on' : ''}`} aria-pressed={value === n} onClick={() => onPick(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

/** Score entry (or correction) for one match, with forfeit options behind a second tap. */
export default function ShowdownScoreModal({ match, raceTo, payoutVersion = 1, correcting = false, error = '', onSave, onForfeit, onCancel }) {
  const v2 = payoutVersion === 2;
  const target = v2 ? 'the champion bonus' : 'the championship';
  const m = match;
  const [s1, setS1] = useState(correcting && m.result === 'played' ? m.score1 : null);
  const [s2, setS2] = useState(correcting && m.result === 'played' ? m.score2 : null);
  const [forfeit, setForfeit] = useState(null);
  const qualifying = m.phase === 'qualifying';
  const final = m.roundKey === 'final';
  const valid = s1 !== null && s2 !== null && ((s1 === raceTo) !== (s2 === raceTo));
  const forfeitLabel = forfeit === 'both' ? 'Both players forfeit (double forfeit)' : `${forfeit === m.p1 ? m.p1Name : m.p2Name} forfeits`;

  return (
    <div className="cc-modal-overlay" role="presentation" onClick={onCancel}>
      <div className="cc-modal sd-score-modal" role="dialog" aria-modal="true" aria-labelledby="sd-score-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="sd-score-title">{correcting ? 'Correct result' : 'Record result'}{' \u00b7 '}{m.label}</h2>
        <p className="sd-note">Race to {raceTo}. One player must reach exactly {raceTo}.</p>
        {correcting ? <p className="sd-warn">This changes a finished result. Standings and earnings update automatically and the change is written to the audit log.</p> : null}
        {correcting && m.resultText ? <p className="sd-note">Currently: {m.resultText}</p> : null}

        <ScoreRow name={m.p1Name} value={s1} raceTo={raceTo} onPick={setS1} />
        <ScoreRow name={m.p2Name} value={s2} raceTo={raceTo} onPick={setS2} />
        {s1 !== null && s2 !== null && !valid ? <p className="sd-error">One player must have exactly {raceTo} and the other fewer.</p> : null}
        {error ? <p className="sd-error" role="alert">{error}</p> : null}

        <div className="sd-modal-actions">
          <button type="button" className="tb-btn-new" onClick={onCancel}>Cancel</button>
          <button type="button" className="sd-btn sd-btn-primary" disabled={!valid} onClick={() => onSave(String(s1), String(s2))}>
            {correcting ? 'Save correction' : 'Save result'}
          </button>
        </div>

        <details className="sd-forfeit">
          <summary>Forfeit or no-show</summary>
          <p className="sd-note">
            {qualifying
              ? `A forfeit is an administrative ${raceTo}\u20130 win. A double forfeit gives nobody the win; that match\u2019s payout moves to ${target}.`
              : 'In the playoffs a forfeit is a walkover: the opponent advances and is paid the round.'}
            {!qualifying && !final ? ` A double forfeit advances nobody; the round payout moves to ${target} and a waiting opponent advances by administrative bye.` : ''}
            {final ? ' If both finalists forfeit, no champion is chosen, the championship payout is held, and the event cannot be completed until an earlier result is corrected.' : ''}
          </p>
          {v2 ? (
            <p className="sd-warn">
              Forfeits pay no per-game money. Games already played before a forfeit cannot be recorded, so they are not paid.
              If the match was finished at the table, record the real score instead.
            </p>
          ) : null}
          {!forfeit ? (
            <div className="sd-btn-row">
              <button type="button" className="sd-btn sd-btn-warn" onClick={() => setForfeit(m.p1)}>{m.p1Name} forfeits</button>
              <button type="button" className="sd-btn sd-btn-warn" onClick={() => setForfeit(m.p2)}>{m.p2Name} forfeits</button>
              <button type="button" className="sd-btn sd-btn-danger" onClick={() => setForfeit('both')}>Both forfeit</button>
            </div>
          ) : (
            <div className="sd-btn-row">
              <span className="sd-warn">{forfeitLabel}?</span>
              <button type="button" className="tb-btn-new" onClick={() => setForfeit(null)}>Back</button>
              <button type="button" className="sd-btn sd-btn-danger" onClick={() => onForfeit(forfeit === 'both' ? [m.p1, m.p2] : [forfeit])}>Confirm forfeit</button>
            </div>
          )}
        </details>
      </div>
    </div>
  );
}
