import React from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { finishPlaceLabel } from './cashClimbPlacePrizes.js';
import WinLoss from './WinLoss.jsx';

function tag(player) {
  if (player.finish_place) return finishPlaceLabel(player.finish_place);
  if (player.eliminated) return 'Out';
  if (player.in_koh) return 'KOH';
  return 'In';
}

export default function CashClimbTvStandings({ board, layout = 'landscape' }) {
  const completed = board.status === 'completed';
  const kicker = completed
    ? 'Cash rank'
    : board.kohStarted
      ? 'King of the Hill'
      : 'Standings';
  const count = board.standings.length;
  const cols = layout === 'portrait' ? 1 : (count >= 14 ? 2 : 1);
  const rows = Math.max(1, Math.ceil(count / cols));

  return (
    <section className="cc-tv-standings">
      <p className="cc-tv-kicker">{kicker}</p>
      <ol
        className="cc-tv-standings-list"
        style={{
          '--cc-tv-n': count,
          '--cc-tv-stand-cols': cols,
          '--cc-tv-stand-rows': rows,
        }}
      >
        {board.standings.map((p, i) => (
          <li
            key={p.player_id}
            className={`cc-tv-standings-row ${p.eliminated ? 'is-out' : ''} ${p.in_koh ? 'is-koh' : ''} ${i === 0 ? 'is-lead' : ''}`}
          >
            <span className="cc-tv-rank">{i + 1}</span>
            <span className="cc-tv-standings-main">
              <span className="cc-tv-standings-name">{p.player_name}</span>
              <span className="cc-tv-standings-meta">
                <WinLoss wins={p.wins} losses={p.losses} />
                {board.kohStarted && (
                  <>
                    {' · '}
                    <WinLoss prefix="KOH" wins={p.koh_wins} losses={p.koh_losses} />
                  </>
                )}
                {' · '}
                <span className={`cc-tv-tag ${p.finish_place ? 'cc-tv-tag-place' : `cc-tv-tag-${tag(p).toLowerCase()}`}`}>{tag(p)}</span>
              </span>
            </span>
            <span className="cc-tv-standings-paid">{formatMoney(p.total_payout)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
