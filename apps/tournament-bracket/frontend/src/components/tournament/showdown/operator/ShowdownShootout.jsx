import React from 'react';
import { SHOOTOUT_PROCEDURE } from '../showdownRules.js';

function Losses({ n }) {
  return (
    <span className="sd-losses" aria-label={`${n} loss${n === 1 ? '' : 'es'}`}>
      {[0, 1].map((i) => <span key={i} className={i < n ? 'is-on' : ''} />)}
    </span>
  );
}

/** Winner-stays, two-loss shootout: for the playoff cutoff, or among tied qualifiers for the opening byes. */
export default function ShowdownShootout({ view, corrections, canReopen, onLag, onRack, onUndo, onReopen }) {
  if (!view) return <section className="sd-panel"><p className="sd-note">No shootout was needed.</p></section>;
  const v = view;
  const alive = v.order.filter((p) => !p.out).length;
  return (
    <section className="sd-panel sd-shootout" aria-label={v.title}>
      <div className="sd-panel-head">
        <h3>{v.title}</h3>
        <span className="sd-progress">
          {v.active ? `${alive} players for ${v.spots} ${v.spotLabel} \u00b7 ${v.eliminationsLeft} more elimination${v.eliminationsLeft === 1 ? '' : 's'}` : 'Decided'}
        </span>
      </div>
      <p className="sd-note">{v.purpose}</p>
      <ul className="sd-note-list">{SHOOTOUT_PROCEDURE.map((r) => <li key={r}>{r}</li>)}</ul>

      <ol className="sd-shootout-order" aria-label="Shootout order">
        {v.order.map((p) => (
          <li key={p.id} className={p.out ? 'is-out' : p.survivor ? 'is-survivor' : ''}>
            <span className="sd-seat">{p.seat}</span>
            <strong>{p.name}</strong>
            <Losses n={p.losses} />
            {p.out ? <small>Eliminated</small> : null}
            {p.survivor ? <small>{v.survivorLabel}</small> : null}
            {v.holder?.id === p.id && v.active ? <small className="sd-tag">At table</small> : null}
            {v.challenger?.id === p.id ? <small className="sd-tag">Challenger</small> : null}
          </li>
        ))}
      </ol>

      {v.status === 'lag' ? (
        <div className="sd-shootout-step">
          <p><strong>Who starts the first game:</strong> {v.lagPlayers[0].name} or {v.lagPlayers[1].name}</p>
          <div className="sd-btn-row">
            {v.lagPlayers.map((p) => (
              <button key={p.id} type="button" className="sd-btn sd-btn-primary" onClick={() => onLag(p.id)}>{p.name} starts</button>
            ))}
          </div>
        </div>
      ) : null}

      {v.status === 'in-progress' ? (
        <div className="sd-shootout-step">
          <p className="sd-shootout-table">
            <span><small>Holds the table</small><strong>{v.holder.name}</strong></span>
            <span className="sd-vs">vs</span>
            <span><small>Incoming challenger</small><strong>{v.challenger.name}</strong></span>
          </p>
          <p><strong>Starts:</strong> {v.breaker.name}{v.queue.length ? ` \u00b7 Next up: ${v.queue.join(', ')}` : ''}</p>
          <div className="sd-btn-row">
            <button type="button" className="sd-btn sd-btn-primary" onClick={() => onRack(v.holder.id)}>{v.holder.name} won the game</button>
            <button type="button" className="sd-btn sd-btn-primary" onClick={() => onRack(v.challenger.id)}>{v.challenger.name} won the game</button>
          </div>
        </div>
      ) : null}

      {v.status === 'complete' ? <p className="sd-ok">Shootout decided. {v.decidedLabel}: {v.survivors.join(', ')}.</p> : null}

      <div className="sd-btn-row">
        {v.active && v.canUndo ? (
          <button type="button" className="sd-btn sd-btn-warn" onClick={onUndo}>{v.racks.length ? `Undo game ${v.racks.length}` : 'Undo who starts'}</button>
        ) : null}
        {!v.active && corrections && canReopen ? (
          <button type="button" className="sd-btn sd-btn-danger" onClick={onReopen}>Reopen shootout</button>
        ) : null}
      </div>

      {v.racks.length ? (
        <>
          <h4>Games</h4>
          <ol className="sd-racks">
            {v.racks.map((r) => (
              <li key={r.n}>
                Game {r.n}: {r.winnerName} beat {r.loserName}{r.eliminatedName ? ` \u2014 ${r.eliminatedName} eliminated` : ''}
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}
