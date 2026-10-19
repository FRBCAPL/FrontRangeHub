import React from 'react';
import { money } from '../operator/showdownView.js';

export function TvTables({ tables, title = 'On the tables' }) {
  return (
    <section className="sd-tv-card">
      <h2>{title}</h2>
      {tables.length ? (
        <ul className="sd-tv-tables">
          {tables.map((m) => (
            <li key={m.id}>
              <span className="sd-tv-table">Table {m.table}</span>
              <strong>{m.p1Name}</strong><em>vs</em><strong>{m.p2Name}</strong>
              <small>{m.label}</small>
            </li>
          ))}
        </ul>
      ) : <p className="sd-tv-muted">No matches on a table.</p>}
    </section>
  );
}

export function TvList({ title, items, render }) {
  if (!items?.length) return null;
  return (
    <section className="sd-tv-card">
      <h2>{title}</h2>
      <ul className="sd-tv-list">{items.map((x) => <li key={x.id}>{render(x)}</li>)}</ul>
    </section>
  );
}

export function TvStandings({ standings }) {
  return (
    <section className="sd-tv-card sd-tv-standings">
      <h2>Standings <small>Top {standings.spots} advance &middot; {standings.progress}</small></h2>
      <table>
        <tbody>
          {standings.rows.map((r, i) => (
            <tr key={r.id} className={`is-${r.status}${i === standings.cutoffAfterIndex ? ' is-cutoff' : ''}`}>
              <td>{r.rank}</td><td>{r.name}</td><td>{r.wins} W</td><td>{r.gw}&ndash;{r.gl}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(standings.closeCalls || []).map((c) => <p key={c.kind} className="sd-tv-close"><strong>{c.title}:</strong> {c.text}</p>)}
    </section>
  );
}

export function TvShootout({ v }) {
  if (!v) return null;
  return (
    <section className="sd-tv-card sd-tv-shootout">
      <h2>{v.title} <small>{v.spots} {v.spotLabel} &middot; {v.eliminationsLeft} more elimination{v.eliminationsLeft === 1 ? '' : 's'}</small></h2>
      {v.status === 'in-progress' ? (
        <p className="sd-tv-vs">
          <span><small>Holds the table</small><strong>{v.holder.name}</strong></span>
          <em>vs</em>
          <span><small>Challenger</small><strong>{v.challenger.name}</strong></span>
          <span><small>Starts</small><strong>{v.breaker.name}</strong></span>
        </p>
      ) : null}
      {v.status === 'lag' ? <p className="sd-tv-muted">Deciding who starts: {v.lagPlayers[0].name} or {v.lagPlayers[1].name}</p> : null}
      <ul className="sd-tv-list">
        {v.order.map((p) => (
          <li key={p.id} className={p.out ? 'is-out' : p.survivor ? 'is-in' : ''}>
            {p.name} &middot; {p.losses} loss{p.losses === 1 ? '' : 'es'}{p.out ? ' \u00b7 out' : p.survivor ? ` \u00b7 ${v.survivorLabel.toLowerCase()}` : ''}
          </li>
        ))}
      </ul>
      {v.status === 'complete' ? <p className="sd-tv-good">{v.decidedLabel}: {v.survivors.join(', ')}</p> : null}
    </section>
  );
}

function TvMatch({ m }) {
  return (
    <div className={`sd-tv-bm is-${m.status}`}>
      <span className={m.winnerId && m.winnerId === m.p1 ? 'is-win' : ''}>{m.p1Name}</span>
      <span className={m.winnerId && m.winnerId === m.p2 ? 'is-win' : ''}>{m.p2Name}</span>
      {m.status === 'completed' && m.result !== 'played' ? <small>{m.resultText}</small> : null}
    </div>
  );
}

function roundItems(r, byes) {
  if (r.key !== 'quarterfinal' || !byes.length) return r.matches.map((m) => <TvMatch key={m.id} m={m} />);
  return [1, 2, 3, 4].map((section) => {
    const b = byes.find((x) => x.section === section);
    if (b) {
      return (
        <div key={`bye-${section}`} className="sd-tv-bm is-completed">
          <span className="is-win">{b.name}</span>
          <small>Bye to Semifinal {b.semifinal}</small>
        </div>
      );
    }
    const m = r.matches.find((x) => x.section === section);
    return m ? <TvMatch key={m.id} m={m} /> : null;
  });
}

export function TvBracket({ rounds, byes = [], championshipStatus }) {
  return (
    <section className="sd-tv-card sd-tv-bracket">
      <h2>Playoffs</h2>
      {championshipStatus?.status === 'unresolved' ? <p className="sd-tv-warn">Championship unresolved &mdash; the director will resolve it.</p> : null}
      <div className="sd-tv-rounds">
        {rounds.map((r) => (
          <div key={r.key}>
            <h3>{r.label} <small>{money(r.payout)} a win</small></h3>
            {roundItems(r, byes)}
          </div>
        ))}
      </div>
    </section>
  );
}
