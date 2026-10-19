import React from 'react';
import ShowdownBracketRounds from '../../operator/ShowdownBracketRounds.jsx';
import ShowdownV3Standings from '../../operator/v3/ShowdownV3Standings.jsx';
import ShowdownPublicShootout from '../ShowdownPublicShootout.jsx';
import { bracketViewV3 } from '../../operator/v3/showdownV3BoardView.js';
import { standingsViewV3 } from '../../operator/v3/showdownV3StandingsView.js';
import { v3Dollars } from '../../operator/v3/showdownV3MoneyView.js';
import { resultsView } from '../../operator/showdownBoardView.js';
import { v3PublicSchedule, v3PayoutRules, v3PublicSettlement } from './showdownV3PublicView.js';

/** Qualifying schedule: every match by round, with opponents, game count and the score once played. */
export function ShowdownV3PublicSchedule({ event }) {
  return (
    <section className="sd-panel" aria-label="Qualifying schedule">
      <h3>Qualifying schedule</h3>
      <p className="sd-note">Each player plays two qualifying matches: one in Round 1 and one in Round 2. Round 2 games pay more.</p>
      {v3PublicSchedule(event).map((g) => (
        <div key={g.title}>
          <h4>{g.title}</h4>
          <ul className="sd-pub-list">
            {g.matches.map((m) => (
              <li key={m.id} className={`sd-pub-match${m.done ? ' is-done' : ''}`}>
                <span className="sd-pub-label">{m.roundText} &middot; {m.gamesText}</span>
                <span>{m.p1Name} <em>vs</em> {m.p2Name}</span>
                <small className={m.tie ? 'sd-ok' : ''}>{m.stateText}</small>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function ShowdownV3PublicStandings({ event }) {
  return (
    <>
      <ShowdownV3Standings view={standingsViewV3(event)} status={event.status} compact readOnly />
      {(event.shootouts || []).length && event.status !== 'shootout' ? <ShowdownPublicShootout event={event} /> : null}
      <ShowdownV3PublicSchedule event={event} />
    </>
  );
}

export function ShowdownV3PublicBracket({ event }) {
  const v = bracketViewV3(event);
  if (!v || !v.confirmed) {
    return <section className="sd-panel"><h3>Playoff bracket</h3><p className="sd-note">The bracket appears here once qualifying is finished and the director confirms the draw.</p></section>;
  }
  return (
    <section className="sd-panel" aria-label="Playoff bracket">
      <h3>{v.size}-player playoff bracket</h3>
      <p className="sd-note">{v.raceNote}</p>
      {v.championship.status === 'unresolved' ? <p className="sd-warn">Championship unresolved: {v.championship.reason} The director will resolve it.</p> : null}
      {v.byes.length ? <p className="sd-note">Semifinal byes ({v.formatAmount(v.byePay)} each): {v.byes.map((b) => b.name).join(', ')}.</p> : null}
      <ShowdownBracketRounds v={v} readOnly />
    </section>
  );
}

export function ShowdownV3PublicMoney({ event }) {
  const s = v3PublicSettlement(event);
  return (
    <>
      <section className="sd-panel" aria-label="Prize pool">
        <div className="sd-panel-head">
          <h3>Prize pool</h3>
          <span className="sd-progress">{s.status}</span>
        </div>
        <div className="cc-stat-row">
          <div className="cc-stat"><span>Prize pool</span><strong>{s.pool}</strong></div>
          <div className="cc-stat"><span>Earned by players</span><strong>{s.paid}</strong></div>
        </div>
        {s.lines.map((l) => <p key={l} className="sd-note">{l}</p>)}
      </section>
      <section className="sd-panel" aria-label="How the money works">
        <h3>How the money works</h3>
        <ul className="sd-note-list">{v3PayoutRules(event.payoutPlan).map((l) => <li key={l}>{l}</li>)}</ul>
      </section>
      <section className="sd-panel" aria-label="Earnings">
        <h3>Earnings</h3>
        {s.earners.length ? (
          <div className="sd-table-wrap">
            <table className="sd-table sd-earnings">
              <thead>
                <tr>
                  <th>Player</th><th className="sd-num">Qualifying games</th><th className="sd-num">Credits</th>
                  <th className="sd-num">Playoff games</th><th className="sd-num">Match-win bonuses</th><th className="sd-num">Bye</th>
                  <th className="sd-num">Champion / split</th><th className="sd-num">Adjustments</th><th className="sd-num">Total</th>
                </tr>
              </thead>
              <tbody>
                {s.earners.map((p) => (
                  <tr key={p.playerId} className={p.withdrawn ? 'is-withdrawn' : ''}>
                    <td>{p.name}{p.withdrawn ? <small> (withdrew)</small> : null}</td>
                    <td className="sd-num">{p.qualifying}</td>
                    <td className="sd-num">{p.credit}</td>
                    <td className="sd-num">{p.playoffGames}</td>
                    <td className="sd-num">{p.matchWins}</td>
                    <td className="sd-num">{p.bye}</td>
                    <td className="sd-num">{p.settlement}</td>
                    <td className="sd-num">{p.adjustment}</td>
                    <td className="sd-num"><strong>{p.total}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="sd-note">No money won yet.</p>}
        <p className="sd-note">Credits are administrative (games credited for a forfeit) and are not games won.</p>
      </section>
    </>
  );
}

/** Champion, final standings and settlement status (or standings so far). */
export function ShowdownV3PublicResults({ event }) {
  const v = resultsView(event);
  const s = v3PublicSettlement(event);
  const done = event.status === 'completed';
  const champion = done && event.championId ? v.rows.find((r) => r.place === 1) : null;
  return (
    <section className="sd-panel" aria-label="Final standings">
      {champion ? (
        <div className="sd-pub-champion">
          <small>{champion.stage}</small>
          <strong>{champion.name}</strong>
          <span>{v3Dollars(champion.earnings)}</span>
        </div>
      ) : null}
      {v.championship.status === 'unresolved' ? <p className="sd-warn">Championship unresolved. The director will resolve it.</p> : null}
      {done ? s.lines.map((l) => <p key={l} className="sd-note">{l}</p>) : null}
      <h3>{done ? 'Final standings' : 'Standings so far'}</h3>
      <div className="sd-table-wrap">
        <table className="sd-table">
          <thead><tr><th>Place</th><th>Player</th><th>Finish</th><th className="sd-num">Earnings</th></tr></thead>
          <tbody>
            {v.rows.map((r) => (
              <tr key={r.playerId} className={champion && r.place === 1 ? 'is-champion' : ''}>
                <td>{r.placeLabel || '\u2014'}</td>
                <td>{r.name}</td>
                <td>{r.stage}</td>
                <td className="sd-num">{v3Dollars(r.earnings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
