import React, { useState } from 'react';
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';
import { cashClimbV3StartProblems } from './cashClimbV3Play.js';
import { money, playerNameOf } from './cashClimbV3View.js';
import { drawBadge } from './CashClimbV3DrawEditor.jsx';
import CashClimbV3Payouts from './CashClimbV3Payouts.jsx';
import CashClimbV3Dialog from './CashClimbV3Dialog.jsx';

/**
 * A saved tournament that has not started: the complete draw for review, setup editing, and the
 * explicit start that makes the draw official and locks everything.
 */
export default function CashClimbV3StartView({ record, onEdit, onStart }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState([]);
  const name = playerNameOf(record);
  const { placement, event } = record;
  const blocking = confirming ? cashClimbV3StartProblems(record) : [];
  const mainSlot = (s) => ('entrant' in s ? name(s.entrant) : `Winner of Preliminary ${s.preliminary + 1}`);

  const start = () => {
    if (busy) return;
    setBusy(true);
    const r = onStart();
    if (r.status !== 'ok') { setProblems(r.problems); setBusy(false); }
  };

  return (
    <>
      <CashClimbV3Payouts payout={record.payout} shape={cashClimbV3Shape(record.players.length)} locked title="Payouts (locked when you start)" />
      <section className="ccv3-draw" aria-label="Bracket draw">
        <div className="ccv3-draw-head">
          <h4>Bracket draw</h4>
          <span className={`ccv3-badge${record.draw?.adjusted ? ' is-adjusted' : ''}`}>{drawBadge(record.draw)}</span>
        </div>
        <p className="cc-setup-note">Not official yet. Review every position; the draw becomes official when you start the tournament.</p>
        <ol className="ccv3-draw-list">
          {placement.preliminary.map((pair, k) => <li key={`p${k}`}><strong>Preliminary {k + 1}</strong> {pair.map(name).join(' vs ')}</li>)}
          {placement.main.map((s, i) => (i % 2 === 0 ? (
            <li key={`o${i}`}><strong>Opening {i / 2 + 1}</strong> {mainSlot(s)} vs {mainSlot(placement.main[i + 1])}</li>
          ) : null))}
        </ol>
      </section>
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onEdit}>Edit setup and draw</button>
        <button type="button" className="btn-primary" onClick={() => { setProblems([]); setConfirming(true); }}>Start Tournament</button>
      </div>
      {confirming ? (
        <CashClimbV3Dialog title="Start the tournament?" onClose={() => setConfirming(false)} busy={busy}>
          {blocking.length ? (
            <>
              <p className="cc-setup-note">This tournament cannot start yet:</p>
              <ul className="ccv3-problems">{blocking.map((p) => <li key={p}>{p}</li>)}</ul>
            </>
          ) : (
            <>
              <p className="cc-setup-note">
                {record.players.length} players · entry ${event.config.entryFeeCents / 100} · added ${event.config.addedMoneyCents / 100} · race to {event.config.raceTo} · prize pool {money(record.payout.prizePoolCents)}
              </p>
              <p className="cc-setup-note">
                Starting makes the draw shown on this screen official ({drawBadge(record.draw).toLowerCase()}). The players, draw, entry fee, added money,
                race length and payouts are then locked and cannot be changed.
              </p>
            </>
          )}
          {problems.length ? <ul className="ccv3-problems" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>Not yet</button>
            {!blocking.length ? <button type="button" className="btn-primary" onClick={start} disabled={busy}>{busy ? 'Starting…' : 'Lock the draw and start'}</button> : null}
          </div>
        </CashClimbV3Dialog>
      ) : null}
    </>
  );
}
