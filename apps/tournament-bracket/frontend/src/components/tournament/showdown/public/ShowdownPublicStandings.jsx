import React from 'react';
import { standingsView } from '../operator/showdownBoardView.js';
import { circleView } from '../operator/showdownView.js';
import ShowdownCloseCalls from '../operator/ShowdownCloseCalls.jsx';
import { TIEBREAKERS, TIEBREAKER_RULE } from '../showdownRules.js';

const STATUS_TEXT = { qualified: 'Playoffs', tied: 'Tied at cutoff', out: '', withdrawn: 'Withdrew' };

/** Read-only qualifying standings with the cutoff, plus each player's circle matches. */
export default function ShowdownPublicStandings({ event }) {
  const v = standingsView(event);
  const circle = circleView(event);
  return (
    <>
      <section className="sd-panel" aria-label="Qualifying standings">
        <div className="sd-panel-head">
          <h3>Qualifying standings</h3>
          <span className="sd-progress">{v.locked ? 'Final' : `${v.completedMatches} of ${v.totalMatches} matches played`}</span>
        </div>
        <p className="sd-note">Top {v.spots} reach the playoffs. The line marks the cutoff.</p>
        <ShowdownCloseCalls calls={v.closeCalls} />
        {v.tie ? <p className="sd-warn">Tie at the cutoff: {v.tieNames.join(', ')}. {v.locked ? 'A shootout decides it.' : 'If it stands, a shootout decides it.'}</p> : null}
        <div className="sd-table-wrap">
          <table className="sd-table sd-standings">
            <thead>
              <tr><th>#</th><th>Player</th><th className="sd-num">W</th><th className="sd-num">GW</th><th className="sd-num">GL</th><th>Status</th></tr>
            </thead>
            <tbody>
              {v.rows.map((r, i) => (
                <tr key={r.playerId} className={`is-${r.status}${i === v.cutoffAfterIndex ? ' sd-cutoff' : ''}`}>
                  <td>{r.rankLabel}</td>
                  <td>{r.name}</td>
                  <td className="sd-num">{r.matchWins}</td>
                  <td className="sd-num">{r.gamesWon}</td>
                  <td className="sd-num">{r.gamesLost}</td>
                  <td>{r.statusText ?? STATUS_TEXT[r.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sd-note">
          Ties are broken in this order: {TIEBREAKERS.map((t, i) => `${i + 1}. ${t.label}`).join('  ')}. {TIEBREAKER_RULE}
        </p>
      </section>
      {circle.length ? (
        <section className="sd-panel" aria-label="Qualifying circle">
          <h3>Qualifying circle</h3>
          <p className="sd-note">Each player plays the two players next to them in the circle.</p>
          <ul className="sd-pub-circle">
            {circle.map((p) => (
              <li key={p.id} className={p.withdrawn ? 'is-withdrawn' : ''}>
                <strong>{p.seat}. {p.name}</strong>
                {p.opponents.map((o) => (
                  <small key={o.matchId}>vs {o.name}{o.done ? ` \u2014 ${o.result === 'played' ? `${o.won ? 'won' : 'lost'} ${o.ownScore}` : o.ownScore}` : ''}</small>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
