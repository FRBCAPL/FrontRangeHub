import React, { useState } from 'react';
import { readyMatchIds } from '../cashClimbV3Progress.js';
import { bracketRounds, defaultRoundKey } from './cashClimbV3View.js';
import { roundOfMatch, roundProgress } from './cashClimbV3RoundStatus.js';
import CashClimbV3MatchCard from './CashClimbV3MatchCard.jsx';
import CashClimbV3RoundBanner from './CashClimbV3RoundBanner.jsx';
import './CashClimbV3Rounds.css';

/**
 * The bracket, one round at a time so large fields stay readable on a tablet. Live: the current round
 * banner (its round strip picks the round shown), a "Ready to play" list, then the picked round's other
 * matches, so no match is shown twice. Settled: round tabs and the picked round. Each round has its own
 * colour (semifinal, championship and so on) on its tab and match cards.
 */
export default function CashClimbV3Bracket({ record, live = false, onEnter }) {
  const rounds = bracketRounds(record.event);
  const progress = roundProgress(record.event);
  const roundOf = roundOfMatch(progress);
  const [picked, setPicked] = useState(null);
  const key = rounds.some((r) => r.key === picked) ? picked : defaultRoundKey(record, rounds);
  const round = rounds.find((r) => r.key === key);
  const ready = live ? readyMatchIds(record.event) : [];
  const rest = round.matchIds.filter((id) => !ready.includes(id));
  const card = (id) => (
    <CashClimbV3MatchCard key={id} record={record} matchId={id} live={live} onEnter={onEnter} round={roundOf.get(id)} />
  );

  if (!live) {
    return (
      <section className="ccv3-bracket" aria-label="Bracket">
        <nav className="ccv3-rounds" aria-label="Rounds">
          {progress.map((r) => (
            <button type="button" key={r.key} className={`ccv3-round-tab tone-${r.tone}${r.key === key ? ' is-active' : ''}`}
              aria-pressed={r.key === key} onClick={() => setPicked(r.key)}>
              {r.label}<span className="ccv3-muted"> {r.done ? `${r.done}/${r.total}` : `(${r.total})`}</span>
            </button>
          ))}
        </nav>
        <div className="ccv3-round-grid">{round.matchIds.map(card)}</div>
      </section>
    );
  }

  return (
    <section className="ccv3-bracket" aria-label="Bracket">
      <CashClimbV3RoundBanner progress={progress} viewing={key} onPickRound={setPicked} />
      <div className="ccv3-ready">
        <h4>Ready to play ({ready.length})</h4>
        {ready.length ? <div className="ccv3-ready-list">{ready.map(card)}</div> : <p className="cc-setup-note">No match is ready right now.</p>}
      </div>
      {rest.length ? (
        <div className="ccv3-round-rest">
          <h4>{round.label}{ready.length ? ': other matches' : ''}</h4>
          <div className="ccv3-round-grid">{rest.map(card)}</div>
        </div>
      ) : picked === key ? (
        <p className="cc-setup-note ccv3-muted">Every {round.label} match still to play is in Ready to play above.</p>
      ) : null}
    </section>
  );
}
