import React from 'react';
import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { formatMoney, sortStandings } from './cashClimbEngine.js';

export default function CashClimbStandings({ stats, currentRound }) {
  const rows = sortStandings(stats);
  const koh = currentRound?.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName;

  return (
    <div className="cc-standings">
      <h3>{koh ? 'King of the Hill' : 'Standings'}</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>{koh ? 'KOH W' : 'W'}</th>
            <th>{koh ? 'KOH L' : 'L'}</th>
            <th>Paid</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.player_id} className={p.eliminated ? 'cc-out' : ''}>
              <td>{i + 1}</td>
              <td>{p.player_name}</td>
              <td>{koh ? p.koh_wins || 0 : p.wins}</td>
              <td>{koh ? p.koh_losses || 0 : p.losses}</td>
              <td>{formatMoney(p.total_payout)}</td>
              <td>{p.eliminated ? 'Out' : p.in_koh ? 'KOH' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
