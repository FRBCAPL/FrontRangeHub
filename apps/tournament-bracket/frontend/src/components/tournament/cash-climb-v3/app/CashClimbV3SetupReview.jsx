import React from 'react';
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';
import CashClimbV3Payouts from './CashClimbV3Payouts.jsx';
import CashClimbV3DrawEditor from './CashClimbV3DrawEditor.jsx';
import { CCV3_MIN_PLAYERS } from './cashClimbV3SetupSteps.js';

/**
 * Final step: a summary of the choices with links back to each step, the payouts (the locked ones when
 * the money settings are unchanged, else the new preview), the draw, and the save button.
 */
export default function CashClimbV3SetupReview({
  f, initial, players, draw, preview, keepsPayout, ready, problems, onStep, onSwap, onRedraw,
}) {
  const enough = players.length >= CCV3_MIN_PLAYERS;
  const row = (label, value, step) => (
    <>
      <dt>{label}</dt>
      <dd>{value} <button type="button" className="ccv3-edit-link" onClick={() => onStep(step)}>Change</button></dd>
    </>
  );
  return (
    <>
      <section className="ccv3-setup-panel" aria-label="Review">
        <h4>Review and save</h4>
        <dl className="ccv3-facts ccv3-review">
          {row('Event', [f.name.trim() || 'No name yet', f.tournamentDate].filter(Boolean).join(' \u00b7 '), 'event')}
          {row('Game', [f.game.trim() || 'Not set', f.notes.trim() ? 'house rules added' : ''].filter(Boolean).join(' \u00b7 '), 'event')}
          {row('Money', `$${f.entryFee || 0} entry \u00b7 $${f.addedMoney || 0} added \u00b7 race to ${f.raceTo || '\u2014'}`, 'money')}
          {row('Players', `${players.length} entered`, 'players')}
        </dl>
        {problems.length
          ? <ul className="ccv3-problems" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          : ready ? <p className="ccv3-setup-ready">Ready to save. Saving does not start the tournament: you review the full draw and start it on the next screen.</p> : null}
        <button type="submit" className="btn-primary ccv3-save" disabled={!ready}>Save tournament</button>
      </section>
      {keepsPayout && enough ? <CashClimbV3Payouts payout={initial.payout} shape={cashClimbV3Shape(initial.players.length)} locked /> : null}
      {preview?.status === 'valid' ? <CashClimbV3Payouts payout={preview} shape={preview.shape} /> : null}
      {initial && preview?.status === 'valid' ? <p className="cc-setup-note ccv3-notice">The money settings changed, so the payouts above are new and replace the saved ones when you save.</p> : null}
      {preview?.status === 'invalid' ? <ul className="ccv3-problems">{preview.problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
      {enough && draw ? <CashClimbV3DrawEditor players={players} draw={draw} onSwap={onSwap} onRedraw={onRedraw} /> : null}
      {!enough ? <p className="cc-setup-note ccv3-muted">The payouts and the draw appear once {CCV3_MIN_PLAYERS} players are entered.</p> : null}
    </>
  );
}
