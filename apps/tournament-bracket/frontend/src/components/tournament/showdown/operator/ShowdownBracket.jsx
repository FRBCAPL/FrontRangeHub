import React from 'react';
import ShowdownBracketRounds from './ShowdownBracketRounds.jsx';
import { money } from './showdownView.js';

function Byes({ v, fmt }) {
  if (!v.byeCount) return null;
  return (
    <div className="sd-byes">
      <h4>Quarterfinal byes ({v.byeCount}) · {fmt(v.byePay)}{v.escalating ? ' bye credit' : ''} each</h4>
      <p className="sd-note">
        Byes go to the highest-ranked qualifiers by the qualifying tiebreakers. A tie for the last bye is settled by a bye
        shootout among the tied qualifiers only; {v.byeRule || 'a bye pays half a quarterfinal win'}.
      </p>
      {v.byeHolders.length ? <p>Bye holders: <strong>{v.byeHolders.map((p) => p.name).join(', ')}</strong></p> : null}
      {v.byeTie.length ? <p className="sd-warn">Bye shootout needed: {v.byeTie.map((p) => p.name).join(', ')}.</p> : null}
      {!v.byes.length && v.byeHolders.length === v.byeCount ? (
        <p className="sd-note">Drawing places each bye holder in a bye section at random and draws everyone else into the quarterfinals.</p>
      ) : null}
    </div>
  );
}

/** Bracket draw, preview, confirmation, and the live bracket by round. */
export default function ShowdownBracket({ view, status, short, onDraw, onConfirm }) {
  if (!view) return null;
  const v = view;
  const fmt = v.formatAmount || money;
  const drawing = status === 'bracket';
  return (
    <section className="sd-panel" aria-label="Playoff bracket">
      <div className="sd-panel-head">
        <h3>{v.size}-player playoff bracket{v.byeCount ? ` (8 positions, ${v.byeCount} bye${v.byeCount === 1 ? '' : 's'})` : ''}</h3>
        <span className="sd-progress">{v.confirmed ? 'Confirmed' : v.drawn ? 'Preview \u2014 not confirmed' : 'Not drawn yet'}</span>
      </div>
      {v.qualifiers.length ? <p className="sd-note">Qualifiers: {v.qualifiers.map((p) => p.name).join(', ')}.</p> : null}
      {short ? <p className="sd-error">Not enough eligible players: {short} playoff spot(s) cannot be filled. The bracket cannot be drawn.</p> : null}
      {v.raceNote ? <p className="sd-note">{v.raceNote}</p> : null}
      <Byes v={v} fmt={fmt} />

      {drawing ? (
        <div className="sd-btn-row">
          <button type="button" className="sd-btn" disabled={Boolean(short)} onClick={onDraw}>{v.drawn ? 'Redraw bracket' : 'Draw bracket'}</button>
          {v.drawn ? <button type="button" className="sd-btn sd-btn-primary" onClick={onConfirm}>Confirm bracket and start playoffs</button> : null}
        </div>
      ) : null}

      {v.championship.status === 'unresolved' ? (
        <p className="sd-error" role="alert">
          Championship unresolved: {v.championship.reason} No champion is chosen and the championship payout is held. Correct an earlier result to continue.
        </p>
      ) : null}
      {v.transfers.length ? (
        <p className="sd-note">
          Unpaid match-win payouts moved to {v.transferTarget}: {v.transfers.map((t) => `${t.label} (${fmt(t.amount)})`).join(', ')}.
        </p>
      ) : null}

      {v.drawn ? <ShowdownBracketRounds v={v} /> : null}
    </section>
  );
}
