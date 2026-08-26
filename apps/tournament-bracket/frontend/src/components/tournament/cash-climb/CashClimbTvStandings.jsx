import React from 'react';
import { formatMoney } from './cashClimbEngine.js';

function record(wins, losses) {
  return `${wins || 0}–${losses || 0}`;
}

function tag(player) {
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
              <strong>{record(p.wins, p.losses)}</strong>
              {board.kohStarted && <small>KOH {record(p.koh_wins, p.koh_losses)}</small>}
            </span>
            <span className="cc-tv-standings-paid">{formatMoney(p.total_payout)}</span>
            <span className={`cc-tv-tag cc-tv-tag-${tag(p).toLowerCase()}`}>{tag(p)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
