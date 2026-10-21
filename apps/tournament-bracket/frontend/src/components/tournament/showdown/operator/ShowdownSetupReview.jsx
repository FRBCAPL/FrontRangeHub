import React from 'react';
import ShowdownPayoutLadder from './ShowdownPayoutLadder.jsx';
import ShowdownV3PlanPanel from './v3/ShowdownV3PlanPanel.jsx';
import { money } from './showdownView.js';
import { previewEntrants, usingPlannedPlayers } from '../showdownPlannedPlayers.js';
import { supportedFieldRange } from '../showdownFieldRules.js';

function EntrantsStat({ state }) {
  const planned = usingPlannedPlayers(state);
  return <div className="cc-stat"><span>Entrants</span><strong>{state.players.length}{planned ? ` of ${previewEntrants(state)} expected` : ''}</strong></div>;
}

/** Money at a glance: entrants, pool, playoff spots, byes and the per-game or qualifying-win pay. */
export function SetupMoneyStats({ state, v3, plan, preview }) {
  const count = previewEntrants(state);
  const fee = Number(state.settings.entryFee) || 0;
  if (v3) {
    return (
      <div className="cc-stat-row">
        <EntrantsStat state={state} />
        <div className="cc-stat"><span>Entry pool</span><strong>{plan ? plan.pool : money(count * fee)}</strong></div>
        <div className="cc-stat"><span>Playoff spots</span><strong>{plan ? plan.qualifiers : '—'}</strong></div>
        <div className="cc-stat"><span>Quarterfinal byes</span><strong>{plan ? plan.byes : '—'}</strong></div>
        {plan?.equalRate
          ? <div className="cc-stat"><span>Every game won</span><strong>{plan.rates.game}</strong></div>
          : <div className="cc-stat"><span>Round 1 / Round 2 game</span><strong>{plan ? `${plan.rates.r1} / ${plan.rates.r2}` : '—'}</strong></div>}
      </div>
    );
  }
  return (
    <div className="cc-stat-row">
      <EntrantsStat state={state} />
      <div className="cc-stat"><span>Prize pool</span><strong>{money(count * fee)}</strong></div>
      <div className="cc-stat"><span>Playoff spots</span><strong>{preview.plan ? preview.plan.qualifiers : '—'}</strong></div>
      <div className="cc-stat"><span>Quarterfinal byes</span><strong>{preview.plan ? preview.plan.byes : '—'}</strong></div>
      <div className="cc-stat"><span>Qualifying win pays</span><strong>{preview.plan ? money(preview.plan.q) : '—'}</strong></div>
    </div>
  );
}

export function PlannedNote({ state }) {
  if (!usingPlannedPlayers(state)) return null;
  return (
    <p className="sd-note" role="status">
      Money shown for {previewEntrants(state)} expected players ({state.players.length} entered so far). Starting recalculates and locks the payouts for the players actually entered.
    </p>
  );
}

/** The payout plan (V3) or payout schedule (V1/V2) the start would lock. */
export function SetupPayouts({ state, v3, plan, preview }) {
  const count = previewEntrants(state);
  const field = supportedFieldRange();
  if (v3) return <ShowdownV3PlanPanel view={plan.view} problems={plan.problems} />;
  if (preview.ladder) return <ShowdownPayoutLadder ladder={preview.ladder} title={`Payout schedule for ${count} ${usingPlannedPlayers(state) ? 'expected ' : ''}entrants`} />;
  return <section className="sd-panel"><p className="sd-note">Payout schedule appears once there are {field.min}–{field.max} entrants and a valid entry fee. {preview.problem}</p></section>;
}

/** Final step: a summary of the choices, the start checklist and the start button. */
export default function ShowdownSetupReview({ state, expected = null, fmt, v3, plan, preview, problems, lockText, onStart, onStep }) {
  const s = state.settings;
  const lengths = v3
    ? `${s.qualifyingGames} games per qualifying match \u00b7 playoffs race to ${s.playoffRaceTo}`
    : `Qualifying race to ${s.qualifyingRaceTo} \u00b7 playoffs race to ${s.playoffRaceTo}`;
  const row = (label, value, step) => (
    <><dt>{label}</dt><dd>{value} <button type="button" className="sd-btn sd-btn-quiet sd-edit-link" onClick={() => onStep(step)}>Change</button></dd></>
  );
  return (
    <>
      <section className="sd-panel" aria-label="Start checklist">
        <h3>Review and start</h3>
        <dl className="sd-facts sd-review">
          {row('Format', fmt ? `${fmt.code} \u00b7 ${fmt.name}` : 'Unknown format', 'event')}
          {row('Event', [state.name, state.tournamentDate, state.venue].filter(Boolean).join(' \u00b7 '), 'event')}
          {row('Entry fee and tables', `${money(Number(s.entryFee) || 0)} \u00b7 ${s.tableCount} tables`, 'settings')}
          {row('Match lengths', lengths, 'settings')}
          {row('Players', `${state.players.length} entered`, 'players')}
        </dl>
        <SetupMoneyStats state={state} v3={v3} plan={plan?.view} preview={preview} />
        <PlannedNote state={state} />
        {expected ? (
          <p className="sd-note" role="status">
            You expected {expected} players and {state.players.length} are entered. The money here is for the {state.players.length} entered, which is what starting locks.
          </p>
        ) : null}
        {problems.length ? (
          <ul className="sd-problems" aria-label="Before you can start">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        ) : <p className="sd-ok">Ready to start. Starting draws the qualifying circle and locks the entrants{v3 ? ' and the entry fee' : ', the entry fee and the qualifying win pay'}. {lockText}</p>}
        <button type="button" className="sd-btn sd-btn-primary sd-btn-big" disabled={problems.length > 0} onClick={onStart}>Start qualifying</button>
      </section>
      <SetupPayouts state={state} v3={v3} plan={plan} preview={preview} />
    </>
  );
}
