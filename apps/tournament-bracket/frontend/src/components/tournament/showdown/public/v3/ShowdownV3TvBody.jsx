import React from 'react';
import { TvList, TvShootout } from '../ShowdownTvSections.jsx';

function Tables({ tables }) {
  return (
    <section className="sd-tv-card">
      <h2>On the tables</h2>
      {tables.length ? (
        <ul className="sd-tv-tables">
          {tables.map((m) => (
            <li key={m.id}>
              <span className="sd-tv-table">Table {m.table}</span>
              <strong>{m.p1Name}</strong><em>vs</em><strong>{m.p2Name}</strong>
              <small>{m.round}</small>
            </li>
          ))}
        </ul>
      ) : <p className="sd-tv-muted">No matches on a table.</p>}
    </section>
  );
}

function Standings({ s }) {
  return (
    <section className="sd-tv-card sd-tv-standings">
      <h2>Standings <small>Top {s.spots} advance &middot; ranked by qualifying $ &middot; {s.progress}</small></h2>
      <table>
        <thead><tr><td /><td /><td>Qualifying $</td><td>Games won</td>{s.hasCredits ? <td>Credits</td> : null}</tr></thead>
        <tbody>
          {s.rows.map((r, i) => (
            <tr key={r.id} className={`is-${r.status}${i === s.cutoffAfterIndex ? ' is-cutoff' : ''}`}>
              <td>{r.rank}</td><td>{r.name}</td><td><strong>{r.total}</strong></td><td>{r.wins}</td>
              {s.hasCredits ? <td>{r.credits || '\u2013'}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      {s.tieText ? <p className="sd-tv-close"><strong>Cutoff:</strong> {s.tieText}</p> : null}
      {s.hasCredits ? <p className="sd-tv-close">Credits are games credited for a forfeit, not games won.</p> : null}
    </section>
  );
}

function Payout({ p }) {
  return (
    <section className="sd-tv-card">
      <h2>Every game won pays</h2>
      <ul className="sd-tv-list">
        {p.rates.map(([label, amount]) => <li key={label}>{label} <strong>{amount}</strong></li>)}
      </ul>
      <h2>Winner&rsquo;s bonus</h2>
      <ul className="sd-tv-list">
        {p.bonuses.map(([label, amount]) => <li key={label}>{label} <strong>{amount}</strong></li>)}
        {p.bye ? <li>Bye to the semifinals <strong>{p.bye}</strong></li> : null}
      </ul>
    </section>
  );
}

function Bracket({ b }) {
  return (
    <section className="sd-tv-card sd-tv-bracket">
      <h2>Playoffs <small>{b.raceNote}</small></h2>
      {b.championshipStatus?.status === 'unresolved' ? <p className="sd-tv-warn">Championship unresolved &mdash; the director will resolve it.</p> : null}
      <div className="sd-tv-rounds">
        {b.rounds.map((r) => (
          <div key={r.key}>
            <h3>{r.label} <small>{r.bonus} winner&rsquo;s bonus</small></h3>
            {r.key === 'quarterfinal' ? b.byes.map((x) => (
              <div key={`bye-${x.section}`} className="sd-tv-bm is-completed"><span className="is-win">{x.name}</span><small>Bye to Semifinal {x.semifinal} &middot; {b.byePay}</small></div>
            )) : null}
            {r.matches.map((m) => (
              <div key={m.id} className={`sd-tv-bm is-${m.status}`}>
                <span className={m.winnerId && m.winnerId === m.p1 ? 'is-win' : ''}>{m.p1Name}</span>
                <span className={m.winnerId && m.winnerId === m.p2 ? 'is-win' : ''}>{m.p2Name}</span>
                {m.scoreText ? <small>{m.scoreText}</small> : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/** V3 TV body for each phase. Dollar standings, V3 rates and bonuses; no V1/V2 money. */
export default function ShowdownV3TvBody({ b }) {
  if (b.mode === 'qualifying') {
    return (
      <>
        <div className="sd-tv-col">
          <Tables tables={b.tables} />
          <TvList title="Up next" items={b.upNext} render={(m) => <>{m.p1Name} <em>vs</em> {m.p2Name} <small>{m.round}</small></>} />
          <TvList title="Latest results" items={b.recent} render={(m) => <>{m.p1Name} <em>vs</em> {m.p2Name} <strong>{m.resultText}</strong></>} />
        </div>
        <div className="sd-tv-col"><Standings s={b.standings} /><Payout p={b.payout} /></div>
      </>
    );
  }
  if (b.mode === 'shootout') return (<><div className="sd-tv-col"><TvShootout v={b.shootout} /></div><div className="sd-tv-col"><Standings s={b.standings} /></div></>);
  if (b.mode === 'bracket') {
    return (
      <>
        <div className="sd-tv-col"><section className="sd-tv-card"><h2>Drawing the playoff bracket</h2><p className="sd-tv-muted">Qualifying is complete.</p></section><Payout p={b.payout} /></div>
        <div className="sd-tv-col"><Standings s={b.standings} /></div>
      </>
    );
  }
  if (b.mode === 'playoffs') {
    return (
      <>
        <div className="sd-tv-col sd-tv-wide"><Bracket b={b} /></div>
        <div className="sd-tv-col"><Tables tables={b.tables} /><Payout p={b.payout} /></div>
      </>
    );
  }
  return (
    <>
      <div className="sd-tv-col">
        {b.champion ? <section className="sd-tv-card sd-tv-champion"><small>{b.champion.title}</small><strong>{b.champion.name}</strong><span>{b.champion.earnings}</span></section> : null}
        <section className="sd-tv-card">{b.settlement.map((l) => <p key={l} className="sd-tv-close">{l}</p>)}</section>
      </div>
      <div className="sd-tv-col">
        <TvList title="Final standings" items={b.final} render={(r) => <>{r.place} {r.name} <small>{r.stage}</small> <strong>{r.earnings}</strong></>} />
      </div>
    </>
  );
}
