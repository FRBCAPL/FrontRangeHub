import React from 'react';
import { shootoutView } from '../operator/showdownView.js';

/** Read-only shootout: order, table holder, challenger, breaker, losses and eliminations. */
export default function ShowdownPublicShootout({ event }) {
  const v = shootoutView(event);
  if (!v) return null;
  const alive = v.order.filter((p) => !p.out).length;
  return (
    <section className="sd-panel sd-shootout" aria-label={v.title}>
      <div className="sd-panel-head">
        <h3>{v.title}</h3>
        <span className="sd-progress">
          {v.active ? `${alive} players for ${v.spots} ${v.spotLabel} \u00b7 ${v.eliminationsLeft} more elimination${v.eliminationsLeft === 1 ? '' : 's'}` : 'Decided'}
        </span>
      </div>
      {v.status === 'lag' ? <p>Lag for the opening break: {v.lagPlayers[0].name} vs {v.lagPlayers[1].name}</p> : null}
      {v.status === 'in-progress' ? (
        <p className="sd-shootout-table">
          <span><small>Holds the table</small><strong>{v.holder.name}</strong></span>
          <span className="sd-vs">vs</span>
          <span><small>Challenger</small><strong>{v.challenger.name}</strong></span>
          <span><small>Breaks</small><strong>{v.breaker.name}</strong></span>
        </p>
      ) : null}
      <ol className="sd-shootout-order">
        {v.order.map((p) => (
          <li key={p.id} className={p.out ? 'is-out' : p.survivor ? 'is-survivor' : ''}>
            <span className="sd-seat">{p.seat}</span>
            <strong>{p.name}</strong>
            <small>{p.losses} loss{p.losses === 1 ? '' : 'es'}</small>
            {p.out ? <small>Eliminated</small> : null}
            {p.survivor ? <small>{v.survivorLabel}</small> : null}
          </li>
        ))}
      </ol>
      {v.status === 'complete' ? <p className="sd-ok">{v.decidedLabel}: {v.survivors.join(', ')}.</p> : null}
      {v.racks.length ? (
        <ol className="sd-racks">
          {v.racks.map((r) => <li key={r.n}>Rack {r.n}: {r.winnerName} beat {r.loserName}{r.eliminatedName ? ` \u2014 ${r.eliminatedName} eliminated` : ''}</li>)}
        </ol>
      ) : null}
    </section>
  );
}
