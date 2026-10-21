import React, { useEffect, useRef, useState } from 'react';
import ShowdownEntrants from './ShowdownEntrants.jsx';
import ShowdownFormatPanel from './ShowdownFormatPanel.jsx';
import ShowdownSetupTime from './ShowdownSetupTime.jsx';
import ShowdownSetupReview, { SetupMoneyStats, PlannedNote } from './ShowdownSetupReview.jsx';
import { SetupStepBar, SetupStepFooter } from './ShowdownSetupStepper.jsx';
import ShowdownV3SetupFields from './v3/ShowdownV3SetupFields.jsx';
import { v3PlanPreview } from './v3/showdownV3PlanView.js';
import { V3_PREVIEW_NOTICE } from './v3/showdownV3Preview.js';
import { payoutPreview } from './showdownBoardView.js';
import { stepIssues, initialStep } from './showdownSetupSteps.js';
import { setupProblems, isPayoutV2, isPayoutV3, payoutVersionOf, formatFor } from '../showdownEngine.js';
import { venuePreset } from '../showdownVenuePresets.js';
import { supportedFieldRange } from '../showdownFieldRules.js';
import { previewEntrants } from '../showdownPlannedPlayers.js';

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

/**
 * The review shows what the start would lock: once enough players are entered, the money is for them,
 * not for the expected number. `expected` is set when the two differ.
 */
function reviewView(state, { v3, version, count, plan, preview }) {
  const entered = state.players.length;
  if (entered < Number(state.settings.minEntrants) || entered === count) return { state, plan, preview, expected: null };
  const actual = { ...state, plannedPlayers: null };
  return {
    state: actual,
    plan: v3 ? v3PlanPreview(actual) : null,
    preview: payoutPreview(entered, state.settings.entryFee, version),
    expected: count,
  };
}

function RaceFacts({ s }) {
  return (
    <>
      <dt>Qualifying</dt><dd>Race to {s.qualifyingRaceTo} · two matches each</dd>
      <dt>Playoffs</dt><dd>Single elimination · race to {s.playoffRaceTo}</dd>
    </>
  );
}

/**
 * Setup in four guided steps. Every step stays mounted (only the current one is shown), so drafts are
 * kept when moving between steps. `v3Preview`: development-only, lets this device start a V3 event while
 * V3 starts are disabled.
 */
export default function ShowdownSetup({ state, act, onStart, onDiscard, onLeave, onChangeFormat, v3Preview = false }) {
  const s = state.settings;
  const [step, setStep] = useState(() => initialStep(state));
  const top = useRef(null);
  useEffect(() => { setStep(initialStep(state)); }, [state.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const goTo = (key) => {
    setStep(key);
    top.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  };

  const preset = venuePreset(state.presetId);
  const range = preset?.tableRange || { min: 1, max: 12 };
  const tableOptions = Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i);
  const version = payoutVersionOf(state);
  const fmt = formatFor(version);
  const v3 = isPayoutV3(state);
  const previewing = v3 && v3Preview;
  const problems = setupProblems(state).filter((p) => !(previewing && p === fmt?.notReady));
  const v2 = isPayoutV2(state);
  const count = previewEntrants(state);
  const preview = payoutPreview(count, s.entryFee, version);
  const plan = v3 ? v3PlanPreview(state, { entrants: count }) : null;
  const review = reviewView(state, { v3, version, count, plan, preview });
  const issues = stepIssues(state);
  const lockText = v3
    ? 'The match lengths and the payout plan below are locked too, and can never be edited after the start.'
    : v2
      ? 'Games won and qualifying wins are paid as they are recorded; playoff payouts lock when qualifying ends.'
      : 'Top-ups and playoff payouts lock when qualifying ends.';
  const field = supportedFieldRange();
  const fieldText = `${s.minEntrants}–${s.maxEntrants} entrants (format supports ${field.min}–${field.max})`;

  return (
    <div className="sd-app" ref={top}>
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
      {previewing ? <p className="sd-warn sd-banner" role="status">{V3_PREVIEW_NOTICE}</p> : null}

      <SetupStepBar step={step} issues={issues} ready={problems.length === 0} onStep={goTo} />

      <div data-step="event" hidden={step !== 'event'}>
        <ShowdownFormatPanel version={version} onChange={onChangeFormat} />
        <section className="sd-panel sd-step-panel" aria-label="Event details">
          <h3>Event</h3>
          {preset ? <p className="sd-tag sd-tag-preset">Preset: {preset.label}</p> : null}
          <CommitInput label="Event name" value={state.name} onCommit={(v) => act('updateDetails', { name: v })} />
          <CommitInput label="Date" type="date" value={state.tournamentDate} onCommit={(v) => act('updateDetails', { tournamentDate: v })} />
          <CommitInput label="Venue" value={state.venue} onCommit={(v) => act('updateDetails', { venue: v })} />
          <p className="sd-note">The tournament director chooses the game and its playing rules. Showdown only records who wins each game.</p>
        </section>
      </div>

      <div data-step="settings" hidden={step !== 'settings'}>
        <div className="sd-setup-grid">
          <section className="sd-panel" aria-label="Event settings">
            <h3>Settings</h3>
            <CommitInput
              key={`planned-${state.plannedPlayers ?? ''}`}
              label={`Expected players (optional, ${field.min}\u2013${field.max})`}
              inputMode="numeric"
              placeholder="Uses the players entered"
              value={state.plannedPlayers ?? ''}
              onCommit={(v) => act('updateDetails', { plannedPlayers: v })}
            />
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
          </section>
          <section className="sd-panel" aria-label="What these settings mean">
            <h3>What these settings mean</h3>
            <ShowdownSetupTime state={state} />
            <SetupMoneyStats state={state} v3={v3} plan={plan?.view} preview={preview} />
            <PlannedNote state={state} />
            <p className="sd-note">The full payout {v3 ? 'plan' : 'schedule'} is on the Review step.</p>
          </section>
        </div>
      </div>

      <div data-step="players" hidden={step !== 'players'}>
        <ShowdownEntrants
          state={state}
          onAdd={(p) => act('addPlayer', p)}
          onRemove={(id) => act('removePlayer', id)}
          onEdit={(id, patch) => act('updatePlayer', id, patch)}
        />
      </div>

      <div data-step="review" hidden={step !== 'review'}>
        <ShowdownSetupReview
          state={review.state} expected={review.expected} fmt={fmt} v3={v3} plan={review.plan} preview={review.preview}
          problems={problems} lockText={lockText} onStart={onStart} onStep={goTo}
        />
      </div>

      <SetupStepFooter step={step} issues={issues} onStep={goTo} />
    </div>
  );
}
