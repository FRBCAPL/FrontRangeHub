import React, { useState } from 'react';
import ShowdownV3PartialScore from './ShowdownV3PartialScore.jsx';
import { v3ScoreProblem, v3PartialProblem, v3PartialEntry, emptyPartial } from './showdownV3ScoreDraft.js';

function ScoreRow({ name, value, max, onPick }) {
  return (
    <div className="sd-score-row">
      <span className="sd-score-name">{name}</span>
      <div className="sd-score-btns" role="group" aria-label={`${name} games`}>
        {Array.from({ length: max + 1 }, (_, n) => (
          <button key={n} type="button" className={`sd-score-btn${value === n ? ' is-on' : ''}`} aria-pressed={value === n} onClick={() => onPick(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function ForfeitSection({ m, limits, onForfeit }) {
  const [who, setWho] = useState(null);
  const [draft, setDraft] = useState(emptyPartial);
  const playoff = limits.phase === 'playoff';
  const ids = who === 'both' ? [m.p1, m.p2] : [who];
  const whoName = who === 'both' ? 'both players' : who === m.p1 ? m.p1Name : m.p2Name;
  const problem = who ? v3PartialProblem(limits, draft, { needVoluntary: playoff }) : '';
  return (
    <details className="sd-forfeit">
      <summary>Forfeit or no-show</summary>
      <p className="sd-note">
        {playoff
          ? `In the playoffs a forfeit is a walkover: the opponent advances and ${limits.walkoverPay || 'is paid the match-win bonus'}. Games already played are paid to both players.`
          : 'Games already played are paid to both players. The opponent also gets an administrative credit for the unplayed games, at their own win rate.'}
        {' '}A double forfeit gives nobody the win.
      </p>
      {!who ? (
        <div className="sd-btn-row">
          <button type="button" className="sd-btn sd-btn-warn" onClick={() => setWho(m.p1)}>{m.p1Name} forfeits</button>
          <button type="button" className="sd-btn sd-btn-warn" onClick={() => setWho(m.p2)}>{m.p2Name} forfeits</button>
          <button type="button" className="sd-btn sd-btn-danger" onClick={() => setWho('both')}>Both forfeit</button>
        </div>
      ) : (
        <>
          <ShowdownV3PartialScore
            title={`${who === 'both' ? 'Both players forfeit' : `${whoName} forfeits`}: games already played`}
            p1Name={m.p1Name}
            p2Name={m.p2Name}
            limits={limits}
            draft={draft}
            onChange={setDraft}
            askVoluntary={playoff}
            voluntaryWho={whoName}
          />
          {problem ? <p className="sd-note" aria-live="polite">{problem}</p> : null}
          <div className="sd-btn-row">
            <button type="button" className="tb-btn-new" onClick={() => { setWho(null); setDraft(emptyPartial()); }}>Back</button>
            <button type="button" className="sd-btn sd-btn-danger" disabled={Boolean(problem)} onClick={() => onForfeit(ids, v3PartialEntry(draft))}>Confirm forfeit</button>
          </div>
        </>
      )}
    </details>
  );
}

/** V3 score entry or correction. Qualifying: a fixed number of games, all played, ties allowed. Playoffs: a race. */
export default function ShowdownV3ScoreModal({ match, limits, correcting = false, error = '', onSave, onForfeit, onCancel }) {
  const m = match;
  const qualifying = limits.phase === 'qualifying';
  const start = correcting && m.result === 'played';
  const [s1, setS1] = useState(start ? m.score1 : null);
  const [s2, setS2] = useState(start ? m.score2 : null);
  const max = qualifying ? limits.games : limits.raceTo;
  const pick1 = (n) => { setS1(n); if (qualifying) setS2(limits.games - n); };
  const pick2 = (n) => { setS2(n); if (qualifying) setS1(limits.games - n); };
  const problem = v3ScoreProblem(limits, s1, s2);
  const tie = !problem && qualifying && s1 === s2;

  return (
    <div className="cc-modal-overlay" role="presentation" onClick={onCancel}>
      <div className="cc-modal sd-score-modal" role="dialog" aria-modal="true" aria-labelledby="sd-score-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="sd-score-title">{correcting ? 'Correct result' : 'Record result'}{' \u00b7 '}{m.label}</h2>
        <p className="sd-note">
          {qualifying
            ? `${limits.games} games, all played. Pick either player's games won; the other is filled in so the two add up to ${limits.games}. A tie is allowed.`
            : `Race to ${limits.raceTo}. One player must reach exactly ${limits.raceTo}.`}
        </p>
        {m.info ? <p className="sd-note">{m.info}</p> : null}
        {correcting ? <p className="sd-warn">This changes a finished result. Standings and earnings update automatically and the change is written to the audit log.</p> : null}
        {correcting && m.resultText ? <p className="sd-note">Currently: {m.resultText}</p> : null}

        <ScoreRow name={m.p1Name} value={s1} max={max} onPick={pick1} />
        <ScoreRow name={m.p2Name} value={s2} max={max} onPick={pick2} />
        {s1 !== null && s2 !== null && problem ? <p className="sd-error">{problem}</p> : null}
        {tie ? <p className="sd-ok">Tie: {s1}&ndash;{s2}. Both players are paid for the games they won.</p> : null}
        {error ? <p className="sd-error" role="alert">{error}</p> : null}

        <div className="sd-modal-actions">
          <button type="button" className="tb-btn-new" onClick={onCancel}>Cancel</button>
          <button type="button" className="sd-btn sd-btn-primary" disabled={Boolean(problem)} onClick={() => onSave(String(s1), String(s2))}>
            {correcting ? 'Save correction' : 'Save result'}
          </button>
        </div>

        <ForfeitSection m={m} limits={limits} onForfeit={onForfeit} />
      </div>
    </div>
  );
}
