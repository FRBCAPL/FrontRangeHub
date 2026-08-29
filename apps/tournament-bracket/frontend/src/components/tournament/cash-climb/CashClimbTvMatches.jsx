import React from 'react';
import { formatMoney } from './cashClimbEngine.js';
import { matchGridColumns, matchResultLine, playerRecord } from './cashClimbTv.js';
import WinLoss from './WinLoss.jsx';

function PlayerRow({ name, record }) {
  return (
    <div className="cc-tv-score-row">
      <span className="cc-tv-player">{name}</span>
      {record ? (
        <span className="cc-tv-score-wl">
          <WinLoss wins={record.wins} losses={record.losses} />
        </span>
      ) : null}
    </div>
  );
}

function MatchPayout({ amount, label = 'Win pays' }) {
  return (
    <p className="cc-tv-payout">
      <span>{label}</span>
      <strong>{formatMoney(amount)}</strong>
    </p>
  );
}

function LiveMatchCard({ board, match }) {
  return (
    <article className="cc-tv-match">
      <div className="cc-tv-match-top">
        <span>Table {match.tableNumber}</span>
        <span className="cc-tv-live-tag">Live</span>
      </div>
      <PlayerRow name={match.player1_name} record={playerRecord(board, match.player1_id)} />
      <p className="cc-tv-vs">vs</p>
      <PlayerRow name={match.player2_name} record={playerRecord(board, match.player2_id)} />
      <MatchPayout amount={match.payout_amount} />
    </article>
  );
}

function UpNextList({ matches }) {
  if (!matches?.length) return null;
  return (
    <div className="cc-tv-up-next">
      <p className="cc-tv-kicker">Up next</p>
      <ul className="cc-tv-on-deck">
        {matches.map((m) => (
          <li key={m.id}>
            <span>{m.player1_name}</span>
            <em>vs</em>
            <span>{m.player2_name}</span>
            <strong className="cc-tv-on-deck-pay">{formatMoney(m.payout_amount)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ByeMatchCard({ board, match }) {
  const name = match.winner_name || match.player1_name;
  return (
    <article className="cc-tv-match cc-tv-match-bye">
      <div className="cc-tv-match-top">
        <span>Bye</span>
        <span className="cc-tv-bye-tag">Bye</span>
      </div>
      <PlayerRow name={name} record={playerRecord(board, match.player1_id || match.winner_id)} />
      <p className="cc-tv-vs">vs</p>
      <PlayerRow name="Bye" />
      <MatchPayout amount={match.payout_amount} label="Bye pays" />
    </article>
  );
}

export default function CashClimbTvMatches({ board, layout = 'landscape' }) {
  const byes = board.byes || [];

  if (board.status === 'completed' && board.winner) {
    return (
      <section className="cc-tv-now cc-tv-now-winner" aria-live="polite">
        <p className="cc-tv-kicker">Last standing</p>
        <h2>{board.winner.player_name}</h2>
        <p className="cc-tv-payout cc-tv-payout-champion">
          <strong>{formatMoney(board.winner.total_payout)}</strong>
        </p>
      </section>
    );
  }

  const cardCount = board.live.length + byes.length;
  if (!cardCount) {
    return (
      <section className="cc-tv-now">
        <p className="cc-tv-kicker">On deck</p>
        <h2>Waiting for the next match</h2>
        {board.roundDone.length > 0 && (
          <ul className="cc-tv-round-done">
            {board.roundDone.map((m) => (
              <li key={m.id}>{matchResultLine(m)}</li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  const columns = matchGridColumns(layout, cardCount);

  return (
    <section className="cc-tv-now" aria-live="polite">
      <div className="cc-tv-now-head">
        <p className="cc-tv-kicker">
          <span className="cc-tv-live-dot" aria-hidden="true" />
          Now playing
        </p>
        <p className="cc-tv-now-round">{board.roundName}</p>
      </div>
      <div
        className="cc-tv-match-grid"
        style={{ '--cc-tv-match-cols': columns }}
      >
        {board.live.map((m) => (
          <LiveMatchCard key={m.id} board={board} match={m} />
        ))}
        {byes.map((m) => (
          <ByeMatchCard key={m.id} board={board} match={m} />
        ))}
      </div>
      <UpNextList matches={board.onDeck} />
    </section>
  );
}
