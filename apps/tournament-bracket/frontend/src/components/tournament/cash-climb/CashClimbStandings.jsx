import React from 'react';
import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { formatMoney, sortStandings } from './cashClimbEngine.js';
import { finishPlaceLabel } from './cashClimbPlacePrizes.js';
import WinLoss from './WinLoss.jsx';

function standingTag(player) {
  if (player.finish_place) return finishPlaceLabel(player.finish_place);
  if (player.eliminated) return 'Out';
  if (player.in_koh) return 'KOH';
  return '';
}

export default function CashClimbStandings({ stats, currentRound }) {
  const rows = sortStandings(stats);
  const koh = currentRound?.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName
    || (stats || []).some((p) => p.in_koh);
  const completed = (stats || []).some((p) => p.finish_place);

  return (
    <div className="cc-standings">
      <h3>{koh ? 'King of the Hill' : 'Standings'}</h3>
      <p className="cc-standings-note">
        {completed
          ? 'Numbered by money earned. Finish tags are last standing in King of the Hill, not cash rank. Paid includes match wins and leftover awards.'
          : 'Ranked by money earned. Paid includes match wins and finishing prizes. Unused KOH is the championship. Unused RR splits 60 / 40 to 2nd and 3rd last standing, unless the champion needs some of it to stay ahead. A podium slice of the RR bank cannot be spent as match wins.'}
      </p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Round Robin W-L</th>
            {koh ? <th>KOH W-L</th> : null}
            <th>Paid</th>
            <th>Finish</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.player_id} className={p.eliminated ? 'cc-out' : ''}>
              <td>{i + 1}</td>
              <td>{p.player_name}</td>
              <td><WinLoss wins={p.wins} losses={p.losses} /></td>
              {koh ? <td><WinLoss wins={p.koh_wins} losses={p.koh_losses} /></td> : null}
              <td>{formatMoney(p.total_payout)}</td>
              <td className={p.finish_place ? 'cc-finish-tag' : ''}>{standingTag(p)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
