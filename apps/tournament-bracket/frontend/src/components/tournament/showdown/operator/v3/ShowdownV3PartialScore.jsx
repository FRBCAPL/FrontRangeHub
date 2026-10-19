import React from 'react';
import { partialMax } from './showdownV3ScoreDraft.js';

function Picker({ name, value, max, disabled, onPick }) {
  return (
    <div className="sd-score-row">
      <span className="sd-score-name">{name}</span>
      <div className="sd-score-btns" role="group" aria-label={`${name} games already won`}>
        {Array.from({ length: max + 1 }, (_, n) => (
          <button key={n} type="button" disabled={disabled} className={`sd-score-btn${value === n ? ' is-on' : ''}`} aria-pressed={value === n} onClick={() => onPick(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

/**
 * Games already played in an unfinished V3 match, or an explicit "no games were played". Nothing is
 * assumed: until one is chosen the action stays disabled. `askVoluntary` adds the required choice of
 * whether the player left by choice (voluntary) or because of an emergency, venue or operator decision.
 */
export default function ShowdownV3PartialScore({ title, p1Name, p2Name, limits, draft, onChange, askVoluntary = false, voluntaryWho = 'the player' }) {
  const d = draft;
  const set = (patch) => onChange({ ...d, ...patch });
  const max = partialMax(limits);
  return (
    <fieldset className="sd-v3-partial">
      <legend>{title}</legend>
      <p className="sd-note">
        {limits.phase === 'qualifying'
          ? `Enter the games each player had already won (fewer than ${limits.games} played in total).`
          : `Enter the games each player had already won (neither reached ${limits.raceTo}).`}
        {' '}Games already played are paid. Nothing is assumed.
      </p>
      <Picker name={p1Name} value={d.score1} max={max} disabled={d.noGamesPlayed} onPick={(n) => set({ score1: n })} />
      <Picker name={p2Name} value={d.score2} max={max} disabled={d.noGamesPlayed} onPick={(n) => set({ score2: n })} />
      <label className="sd-format-confirm">
        <input type="checkbox" checked={d.noGamesPlayed} onChange={(e) => set({ noGamesPlayed: e.target.checked, ...(e.target.checked ? { score1: null, score2: null } : {}) })} />
        I confirm no games were played in this match.
      </label>
      {askVoluntary ? (
        <div className="sd-v3-voluntary" role="radiogroup" aria-label="Why the player is leaving">
          <p className="sd-note"><strong>Why is {voluntaryWho} leaving?</strong> This decides whether a later abandonment can be recorded.</p>
          <label><input type="radio" checked={d.voluntary === true} onChange={() => set({ voluntary: true })} /> By choice (voluntary)</label>
          <label><input type="radio" checked={d.voluntary === false} onChange={() => set({ voluntary: false })} /> Emergency, venue closure or operator decision (involuntary)</label>
        </div>
      ) : null}
    </fieldset>
  );
}
