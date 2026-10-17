import React from 'react';
import { TIEBREAKERS, TIEBREAKER_RULE } from '../showdownRules.js';
import ShowdownCloseCalls from './ShowdownCloseCalls.jsx';

const STATUS_TEXT = { qualified: 'Playoffs', tied: 'Tied at cutoff', out: '', withdrawn: 'Withdrew' };

/**
 * Qualifying standings with all six tiebreakers, the playoff cutoff and any cutoff tie.
 * `compact` drops the tiebreaker detail columns for the narrow column beside the match board.
 */
export default function ShowdownStandings({ view, status, corrections, onLock, onReopen, compact = false }) {
  const v = view;
  const allDone = v.completedMatches === v.totalMatches;
  return (
    <section className={`sd-panel${compact ? ' sd-standings-compact' : ''}`} aria-label="Qualifying standings">
      <div className="sd-panel-head">
        <h3>Qualifying standings</h3>
        <span className="sd-progress">{v.locked ? 'Locked' : `Projected \u00b7 ${v.completedMatches} of ${v.totalMatches} matches`}</span>
      </div>
      {compact ? (
        <p className="sd-note">Top {v.spots} reach the playoffs. Full tiebreakers are on the Standings tab.</p>
      ) : (
        <p className="sd-note">
          Top {v.spots} reach the playoffs. Ties are broken in this order:{' '}
          {TIEBREAKERS.map((t, i) => `${i + 1}. ${t.label}`).join('  ')}. {TIEBREAKER_RULE}
        </p>
      )}
      <ShowdownCloseCalls calls={v.closeCalls} />
      {v.tie ? (
        <p className="sd-warn" role="status">
          Unresolved tie at the cutoff: {v.tieNames.join(', ')}{' \u2014 '}{v.tie.tiedIds.length} players for {v.tie.openSpots} spot{v.tie.openSpots === 1 ? '' : 's'}.
          {v.locked ? ' A shootout decides it.' : ' If it stands when qualifying is locked, a shootout decides it.'}
        </p>
      ) : null}
      {v.short ? <p className="sd-error">Not enough eligible players: {v.short} playoff spot(s) cannot be filled.</p> : null}
      <div className="sd-table-wrap">
        <table className="sd-table sd-standings">
          <thead>
            <tr>
              <th>#</th><th>Player</th>
              <th className="sd-num" title="Match wins">W</th>
              <th className="sd-num" title="Games won">GW</th>
              <th className="sd-num" title="Games lost">GL</th>
              {compact ? null : (
                <>
                  <th className="sd-num" title="Opponents' match wins">Opp W</th>
                  <th className="sd-num" title="Opponents' game differential">Opp +/-</th>
                  <th title="The tiebreaker that placed this player below the player directly above">Separated from player above by</th>
                </>
              )}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {v.rows.map((r, i) => (
              <tr key={r.playerId} className={`is-${r.status}${i === v.cutoffAfterIndex ? ' sd-cutoff' : ''}`}>
                <td className="sd-rank">{r.rankLabel}</td>
                <td className="sd-player">{r.name}</td>
                <td className="sd-num">{r.matchWins}</td>
                <td className="sd-num">{r.gamesWon}</td>
                <td className="sd-num">{r.gamesLost}</td>
                {compact ? null : (
                  <>
                    <td className="sd-num">{r.oppMatchWins}</td>
                    <td className="sd-num">{r.oppGameDiff > 0 ? `+${r.oppGameDiff}` : r.oppGameDiff}</td>
                    <td>{r.separatedByLabel}</td>
                  </>
                )}
                <td className="sd-status">{r.statusText ?? STATUS_TEXT[r.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sd-note">The line under a row marks the playoff cutoff.</p>
      <div className="sd-btn-row">
        {status === 'qualifying' ? (
          <button type="button" className="sd-btn sd-btn-primary" disabled={!allDone} onClick={onLock}>
            {allDone ? 'Lock qualifying standings' : 'Lock qualifying (finish every match first)'}
          </button>
        ) : null}
        {status !== 'qualifying' && corrections ? (
          <button type="button" className="sd-btn sd-btn-danger" onClick={onReopen}>Reopen qualifying to correct a result</button>
        ) : null}
      </div>
    </section>
  );
}
