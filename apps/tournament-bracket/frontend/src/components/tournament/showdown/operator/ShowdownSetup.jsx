import React, { useState } from 'react';
import ShowdownEntrants from './ShowdownEntrants.jsx';
import ShowdownPayoutLadder from './ShowdownPayoutLadder.jsx';
import ShowdownFormatPanel from './ShowdownFormatPanel.jsx';
import ShowdownV3SetupFields from './v3/ShowdownV3SetupFields.jsx';
import ShowdownV3PlanPanel from './v3/ShowdownV3PlanPanel.jsx';
import { v3PlanPreview } from './v3/showdownV3PlanView.js';
import { V3_PREVIEW_NOTICE } from './v3/showdownV3Preview.js';
import { payoutPreview } from './showdownBoardView.js';
import { money } from './showdownView.js';
import { setupProblems, isPayoutV2, isPayoutV3, payoutVersionOf, formatFor } from '../showdownEngine.js';
import { venuePreset } from '../showdownVenuePresets.js';
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

function RaceFacts({ s }) {
  return (
    <>
      <dt>Qualifying</dt><dd>Race to {s.qualifyingRaceTo} · two matches each</dd>
      <dt>Playoffs</dt><dd>Single elimination · race to {s.playoffRaceTo}</dd>
    </>
  );
}

function V3Stats({ state, plan }) {
  return (
    <div className="cc-stat-row">
      <div className="cc-stat"><span>Entrants</span><strong>{state.players.length}</strong></div>
      <div className="cc-stat"><span>Entry pool</span><strong>{plan ? plan.pool : money(state.players.length * (Number(state.settings.entryFee) || 0))}</strong></div>
      <div className="cc-stat"><span>Playoff spots</span><strong>{plan ? plan.qualifiers : '—'}</strong></div>
      <div className="cc-stat"><span>Quarterfinal byes</span><strong>{plan ? plan.byes : '—'}</strong></div>
      {plan?.equalRate
        ? <div className="cc-stat"><span>Every game won</span><strong>{plan.rates.game}</strong></div>
        : <div className="cc-stat"><span>Round 1 / Round 2 game</span><strong>{plan ? `${plan.rates.r1} / ${plan.rates.r2}` : '—'}</strong></div>}
    </div>
  );
}

/** `v3Preview`: development-only, lets this device start a V3 event while V3 starts are disabled. */
export default function ShowdownSetup({ state, act, onStart, onDiscard, onLeave, onChangeFormat, v3Preview = false }) {
  const s = state.settings;
  const preset = venuePreset(state.presetId);
  const range = preset?.tableRange || { min: 1, max: 12 };
  const tableOptions = Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i);
  const version = payoutVersionOf(state);
  const fmt = formatFor(version);
  const v3 = isPayoutV3(state);
  const previewing = v3 && v3Preview;
  const problems = setupProblems(state).filter((p) => !(previewing && p === fmt?.notReady));
  const v2 = isPayoutV2(state);
  const preview = payoutPreview(state.players.length, s.entryFee, version);
  const plan = v3 ? v3PlanPreview(state) : null;
  const lockText = v3
    ? 'The match lengths and the payout plan below are locked too, and can never be edited after the start.'
    : v2
      ? 'Games won and qualifying wins are paid as they are recorded; playoff payouts lock when qualifying ends.'
      : 'Top-ups and playoff payouts lock when qualifying ends.';
  const field = supportedFieldRange();
  const fieldText = `${s.minEntrants}–${s.maxEntrants} entrants (format supports ${field.min}–${field.max})`;

  return (
    <div className="sd-app">
      <header className="cc-play-header">
        <div className="cc-play-header-top">
          <div className="cc-play-title">
            <p className="cc-play-kicker">Cash Climb Showdown · Setup · {fmt ? fmt.code : 'Unknown format'}</p>
            <h1>{state.name}</h1>
          </div>
          <div className="cc-play-actions">
            <button type="button" className="tb-btn-new" onClick={onLeave}>Tournaments menu</button>
            <button type="button" className="tb-btn-new" onClick={onDiscard}>Discard event</button>
          </div>
        </div>
      </header>

      <ShowdownFormatPanel version={version} onChange={onChangeFormat} />
      {previewing ? <p className="sd-warn sd-banner" role="status">{V3_PREVIEW_NOTICE}</p> : null}

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
          {v3 ? <ShowdownV3SetupFields settings={s} act={act} fieldText={fieldText} /> : (
            <>
              <dl className="sd-facts">
                <RaceFacts s={s} />
                <dt>Field</dt><dd>{fieldText}</dd>
              </dl>
              <p className="sd-note">{v2 ? 'Race lengths are fixed: per-game pay and the playoff game reserve depend on them.' : 'Race lengths are part of the V1 format settings.'}</p>
            </>
          )}
          <p className="sd-note">The tournament director chooses the game and its playing rules. Showdown only records who wins each game.</p>
        </section>

        <ShowdownEntrants
          state={state}
          onAdd={(p) => act('addPlayer', p)}
          onRemove={(id) => act('removePlayer', id)}
          onEdit={(id, patch) => act('updatePlayer', id, patch)}
        />
      </div>

      <section className="sd-panel" aria-label="Start checklist">
        {v3 ? <V3Stats state={state} plan={plan.view} /> : (
          <div className="cc-stat-row">
            <div className="cc-stat"><span>Entrants</span><strong>{state.players.length}</strong></div>
            <div className="cc-stat"><span>Prize pool</span><strong>{money(state.players.length * (Number(s.entryFee) || 0))}</strong></div>
            <div className="cc-stat"><span>Playoff spots</span><strong>{preview.plan ? preview.plan.qualifiers : '—'}</strong></div>
            <div className="cc-stat"><span>Quarterfinal byes</span><strong>{preview.plan ? preview.plan.byes : '—'}</strong></div>
            <div className="cc-stat"><span>Qualifying win pays</span><strong>{preview.plan ? money(preview.plan.q) : '—'}</strong></div>
          </div>
        )}
        {problems.length ? (
          <ul className="sd-problems" aria-label="Before you can start">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        ) : <p className="sd-ok">Ready to start. Starting draws the qualifying circle and locks the entrants{v3 ? ' and the entry fee' : ', the entry fee and the qualifying win pay'}. {lockText}</p>}
        <button type="button" className="sd-btn sd-btn-primary sd-btn-big" disabled={problems.length > 0} onClick={onStart}>Start qualifying</button>
      </section>

      {v3 ? <ShowdownV3PlanPanel view={plan.view} problems={plan.problems} /> : null}
      {!v3 && preview.ladder ? <ShowdownPayoutLadder ladder={preview.ladder} title={`Payout schedule for ${state.players.length} entrants`} /> : null}
      {!v3 && !preview.ladder
        ? <section className="sd-panel"><p className="sd-note">Payout schedule appears once there are {field.min}–{field.max} entrants and a valid entry fee. {preview.problem}</p></section>
        : null}
    </div>
  );
}
