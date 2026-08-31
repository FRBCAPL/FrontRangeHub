import React, { useState } from 'react';
import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { formatMoney, sortStandings } from './cashClimbEngine.js';
import { finishPlaceLabel } from './cashClimbPlacePrizes.js';
import WinLoss from './WinLoss.jsx';
import CashClimbPlayerHistoryModal from './CashClimbPlayerHistoryModal.jsx';

function standingTag(player) {
  if (player.chopped) return 'Chop';
  if (player.finish_place) return finishPlaceLabel(player.finish_place);
  if (player.eliminated) return 'Out';
  if (player.in_koh) return 'KOH';
  return '';
}

export default function CashClimbStandings({ stats, currentRound, tournament, briefNote = false }) {
  const [historyPlayer, setHistoryPlayer] = useState(null);
  const rows = sortStandings(stats);
  const koh = currentRound?.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName
    || (stats || []).some((p) => p.in_koh);
  const completed = (stats || []).some((p) => p.finish_place || p.chopped);
  const note = briefNote
    ? (completed ? 'Numbered by money earned.' : 'Ranked by money earned.')
    : completed
      ? 'Numbered by money earned. Finish tags are last standing in King of the Hill, not cash rank. Paid includes match wins and leftover awards. Chop means the last two split remaining leftover.'
      : koh
        ? 'Ranked by money earned. 3rd last leftover is paid when that player sits. Last two may chop remaining leftover 50/50. Unused KOH is the championship. Unused RR leftover for 2nd can move to last standing if needed. 3rd leftover is never taken back.'
        : 'Ranked by money earned. Paid includes match wins and finishing prizes. Unused KOH is the championship. Unused RR splits 60 / 40 to 2nd and 3rd last standing, unless the champion needs some of it to stay ahead. A podium slice of the RR bank cannot be spent as match wins.';

  return (
    <div className="cc-standings">
      <h3>{koh ? 'King of the Hill' : 'Standings'}</h3>
      <p className="cc-standings-note">
        {note}
      </p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th className="cc-standings-wl">Round Robin W-L</th>
            {koh ? <th className="cc-standings-wl">KOH W-L</th> : null}
            <th>Paid</th>
            <th>Finish</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr
              key={p.player_id}
              className={`${p.eliminated ? 'cc-out' : ''}${tournament ? ' cc-standings-row' : ''}`.trim()}
              onClick={tournament ? () => setHistoryPlayer(p) : undefined}
              onKeyDown={tournament ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setHistoryPlayer(p);
                }
              } : undefined}
              tabIndex={tournament ? 0 : undefined}
              role={tournament ? 'button' : undefined}
              aria-label={tournament ? `${p.player_name} match history` : undefined}
            >
              <td>{i + 1}</td>
              <td>
                <span className={tournament ? 'cc-standings-player' : undefined}>{p.player_name}</span>
              </td>
              <td className="cc-standings-wl"><WinLoss wins={p.wins} losses={p.losses} /></td>
              {koh ? <td className="cc-standings-wl"><WinLoss wins={p.koh_wins} losses={p.koh_losses} /></td> : null}
              <td>{formatMoney(p.total_payout)}</td>
              <td className={p.finish_place || p.chopped ? 'cc-finish-tag' : ''}>{standingTag(p)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {historyPlayer && tournament ? (
        <CashClimbPlayerHistoryModal
          tournament={tournament}
          player={historyPlayer}
          onClose={() => setHistoryPlayer(null)}
        />
      ) : null}
    </div>
  );
}
