import React from 'react';

/**
 * V3 qualifying standings: ranked by qualifying dollars. Actual game wins and administrative credits are
 * separate columns so a credit is never mistaken for a game won. `compact` drops the detail columns.
 * `readOnly` (player page): no operator buttons, and the tiebreakers are always listed.
 */
export default function ShowdownV3Standings({ view, status, corrections, onLock, onReopen, compact = false, readOnly = false }) {
  const v = view;
  const allDone = v.completedMatches === v.totalMatches;
  const briefNote = compact && !readOnly;
  return (
    <section className={`sd-panel${compact ? ' sd-standings-compact' : ''}`} aria-label="Qualifying standings">
      <div className="sd-panel-head">
        <h3>Qualifying standings</h3>
        <span className="sd-progress">{v.locked ? (readOnly ? 'Final' : 'Locked') : `${readOnly ? 'So far' : 'Projected'} \u00b7 ${v.completedMatches} of ${v.totalMatches} matches`}</span>
      </div>
      <p className="sd-note">
        Top {v.spots} reach the playoffs, ranked by qualifying dollars earned.
        {briefNote ? ' Full tiebreakers are on the Standings tab.' : ` Ties are broken in this order: ${v.tiebreakers.map((t, i) => `${i + 1}. ${t}`).join('  ')}. A tie still standing at the cutoff or the last bye goes to a shootout.`}
      </p>
      {v.hasCredits ? (
        <p className="sd-note">
          Credits are administrative: games credited for a forfeit, paid at the player&rsquo;s round rate. They count toward qualifying dollars but are not games won.
          {v.creditsFinal ? ' Credits were finalized when qualifying was locked.' : ' Credits marked * are provisional until qualifying is locked.'}
        </p>
      ) : null}
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
              <th className="sd-num" title="Qualifying dollars: game pay plus credits">Qualifying $</th>
              <th className="sd-num" title="Games actually won">Games won</th>
              <th className="sd-num" title="Administrative credit games (not games won)">Credit games</th>
              {compact ? null : (
                <>
                  <th className="sd-num" title="Pay for games actually won">Game pay</th>
                  <th className="sd-num" title="Pay for credited games">Credit pay</th>
                  <th className="sd-num" title="Round 2 games actually won">R2 wins</th>
                  <th className="sd-num" title="Both opponents' qualifying dollars">Opp $</th>
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
                <td className="sd-num"><strong>{r.total}</strong></td>
                <td className="sd-num">{r.actualWins}</td>
                <td className="sd-num">{r.creditWins ? `${r.creditWins}${r.creditProvisional ? '*' : ''}` : '\u2014'}</td>
                {compact ? null : (
                  <>
                    <td className="sd-num">{r.actual}</td>
                    <td className="sd-num">{r.credit}</td>
                    <td className="sd-num">{r.round2Wins}</td>
                    <td className="sd-num">{r.opponents}</td>
                    <td>{r.separatedByLabel}</td>
                  </>
                )}
                <td className="sd-status">{r.statusText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sd-note">The line under a row marks the playoff cutoff.</p>
      {readOnly ? null : <div className="sd-btn-row">
        {status === 'qualifying' ? (
          <button type="button" className="sd-btn sd-btn-primary" disabled={!allDone} onClick={onLock}>
            {allDone ? 'Lock qualifying standings' : 'Lock qualifying (finish every match first)'}
          </button>
        ) : null}
        {status !== 'qualifying' && status !== 'completed' && corrections ? (
          <button type="button" className="sd-btn sd-btn-danger" onClick={onReopen}>Reopen qualifying to correct a result</button>
        ) : null}
      </div>}
    </section>
  );
}
