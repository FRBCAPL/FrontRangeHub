import React, { useState } from 'react';
import ShowdownEntrants from './ShowdownEntrants.jsx';
import ShowdownPayoutLadder from './ShowdownPayoutLadder.jsx';
import { payoutPreview } from './showdownBoardView.js';
import { money } from './showdownView.js';
import { setupProblems } from '../showdownEngine.js';
import { venuePreset } from '../showdownVenuePresets.js';
import { rulesetFor } from '../showdownRules.js';
import { supportedFieldRange } from '../showdownFieldRules.js';

/** Text input that commits on blur / Enter, so the audit log is not flooded per keystroke. */
function CommitInput({ label, value, onCommit, ...rest }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const commit = () => { if (draft !== String(value ?? '')) onCommit(draft); };
  return (
    <label className="sd-field">
      {label}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} {...rest} />
    </label>
  );
}

export default function ShowdownSetup({ state, act, onStart, onDiscard, onLeave }) {
  const s = state.settings;
  const preset = venuePreset(state.presetId);
  const ruleset = rulesetFor(s.rulesetId);
  const range = preset?.tableRange || { min: 1, max: 12 };
  const tableOptions = Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i);
  const problems = setupProblems(state);
  const preview = payoutPreview(state.players.length, s.entryFee);
  const field = supportedFieldRange();

  return (
    <div className="sd-app">
      <header className="cc-play-header">
        <div className="cc-play-header-top">
          <div className="cc-play-title">
            <p className="cc-play-kicker">Cash Climb Showdown · Setup</p>
            <h1>{state.name}</h1>
          </div>
          <div className="cc-play-actions">
            <button type="button" className="tb-btn-new" onClick={onLeave}>Tournaments menu</button>
            <button type="button" className="tb-btn-new" onClick={onDiscard}>Discard event</button>
          </div>
        </div>
      </header>

      <div className="sd-setup-grid">
        <section className="sd-panel" aria-label="Event details">
          <h3>Event</h3>
          {preset ? <p className="sd-tag sd-tag-preset">Preset: {preset.label}</p> : null}
          <CommitInput label="Event name" value={state.name} onCommit={(v) => act('updateDetails', { name: v })} />
          <CommitInput label="Date" type="date" value={state.tournamentDate} onCommit={(v) => act('updateDetails', { tournamentDate: v })} />
          <CommitInput label="Venue" value={state.venue} onCommit={(v) => act('updateDetails', { venue: v })} />
          <CommitInput label="Entry fee ($, whole dollars)" inputMode="numeric" value={s.entryFee} onCommit={(v) => act('updateSettings', { entryFee: v })} />
          <label className="sd-field">
            Tables
            <select value={s.tableCount} onChange={(e) => act('updateSettings', { tableCount: e.target.value })}>
              {tableOptions.map((t) => <option key={t} value={t}>{t} tables</option>)}
            </select>
          </label>
          <dl className="sd-facts">
            <dt>Game</dt><dd>{ruleset?.label || s.game}</dd>
            <dt>Qualifying</dt><dd>Race to {s.qualifyingRaceTo} · two matches each</dd>
            <dt>Playoffs</dt><dd>Single elimination · race to {s.playoffRaceTo}</dd>
            <dt>Field</dt><dd>{s.minEntrants}–{s.maxEntrants} entrants (format supports {field.min}–{field.max})</dd>
          </dl>
          <p className="sd-note">Race lengths come from the {ruleset?.label || 'approved'} ruleset.</p>
        </section>

        <ShowdownEntrants
          state={state}
          onAdd={(p) => act('addPlayer', p)}
          onRemove={(id) => act('removePlayer', id)}
          onEdit={(id, patch) => act('updatePlayer', id, patch)}
        />
      </div>

      <section className="sd-panel" aria-label="Start checklist">
        <div className="cc-stat-row">
          <div className="cc-stat"><span>Entrants</span><strong>{state.players.length}</strong></div>
          <div className="cc-stat"><span>Prize pool</span><strong>{money(state.players.length * (Number(s.entryFee) || 0))}</strong></div>
          <div className="cc-stat"><span>Playoff spots</span><strong>{preview.plan ? preview.plan.qualifiers : '—'}</strong></div>
          <div className="cc-stat"><span>Quarterfinal byes</span><strong>{preview.plan ? preview.plan.byes : '—'}</strong></div>
          <div className="cc-stat"><span>Qualifying win pays</span><strong>{preview.plan ? money(preview.plan.q) : '—'}</strong></div>
        </div>
        {problems.length ? (
          <ul className="sd-problems" aria-label="Before you can start">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        ) : <p className="sd-ok">Ready to start. Starting draws the qualifying circle and locks the entrants, the entry fee and the qualifying win pay. Top-ups and playoff payouts lock when qualifying ends.</p>}
        <button type="button" className="sd-btn sd-btn-primary sd-btn-big" disabled={problems.length > 0} onClick={onStart}>Start qualifying</button>
      </section>

      {preview.ladder
        ? <ShowdownPayoutLadder ladder={preview.ladder} title={`Payout schedule for ${state.players.length} entrants`} />
        : <section className="sd-panel"><p className="sd-note">Payout schedule appears once there are {field.min}–{field.max} entrants and a valid entry fee. {preview.problem}</p></section>}
    </div>
  );
}
