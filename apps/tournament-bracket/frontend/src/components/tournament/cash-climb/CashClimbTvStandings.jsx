import React from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { placeOrdinal } from './cashClimbPlacePrizes.js';
import WinLoss from './WinLoss.jsx';

function tag(player) {
  if (player.finish_place) return placeOrdinal(player.finish_place);
  if (player.eliminated) return 'Out';
  if (player.in_koh) return 'KOH';
  return 'In';
}

export default function CashClimbTvStandings({ board }) {
  return (
    <section className="cc-tv-standings">
      <p className="cc-tv-kicker">{board.kohStarted ? 'King of the Hill' : 'Standings'}</p>
      <ol className="cc-tv-standings-list">
        {board.standings.map((p, i) => (
          <li
            key={p.player_id}
            className={`cc-tv-standings-row ${p.eliminated ? 'is-out' : ''} ${p.in_koh ? 'is-koh' : ''} ${i === 0 ? 'is-lead' : ''}`}
          >
            <span className="cc-tv-rank">{i + 1}</span>
            <span className="cc-tv-standings-name">{p.player_name}</span>
            <span className="cc-tv-standings-wl">
              <strong><WinLoss wins={p.wins} losses={p.losses} /></strong>
              {board.kohStarted && (
                <small><WinLoss prefix="KOH" wins={p.koh_wins} losses={p.koh_losses} /></small>
              )}
            </span>
            <span className="cc-tv-standings-paid">{formatMoney(p.total_payout)}</span>
            <span className={`cc-tv-tag ${p.finish_place ? 'cc-tv-tag-place' : `cc-tv-tag-${tag(p).toLowerCase()}`}`}>{tag(p)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
