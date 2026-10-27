import React, { useState } from 'react';
import { readyMatchIds } from '../cashClimbV3Progress.js';
import { bracketRounds, defaultRoundKey } from './cashClimbV3View.js';
import CashClimbV3MatchCard from './CashClimbV3MatchCard.jsx';

/**
 * The bracket, one round at a time so large fields stay readable on a tablet. `live` adds a
 * "Ready to play" list and play status; `onEnter` opens result entry for a ready match.
 */
export default function CashClimbV3Bracket({ record, live = false, onEnter }) {
  const rounds = bracketRounds(record.event);
  const [picked, setPicked] = useState(null);
  const key = rounds.some((r) => r.key === picked) ? picked : defaultRoundKey(record, rounds);
  const round = rounds.find((r) => r.key === key);
  const ready = live ? readyMatchIds(record.event) : [];
  const counts = (r) => {
    const done = r.matchIds.filter((id) => record.event.matches[id].status !== 'open').length;
    return live || done ? ` ${done}/${r.matchIds.length}` : ` (${r.matchIds.length})`;
  };

  return (
    <section className="ccv3-bracket" aria-label="Bracket">
      {live ? (
        <div className="ccv3-ready">
          <h4>Ready to play ({ready.length})</h4>
          {ready.length ? (
            <div className="ccv3-ready-list">
              {ready.map((id) => <CashClimbV3MatchCard key={id} record={record} matchId={id} live onEnter={onEnter} />)}
            </div>
          ) : <p className="cc-setup-note">No match is ready right now.</p>}
        </div>
      ) : null}
      <nav className="ccv3-rounds" aria-label="Rounds">
        {rounds.map((r) => (
          <button type="button" key={r.key} className={`ccv3-round-tab${r.key === key ? ' is-active' : ''}`} aria-pressed={r.key === key} onClick={() => setPicked(r.key)}>
            {r.label}<span className="ccv3-muted">{counts(r)}</span>
          </button>
        ))}
      </nav>
      <div className="ccv3-round-grid">
        {round.matchIds.map((id) => <CashClimbV3MatchCard key={id} record={record} matchId={id} live={live} onEnter={onEnter} />)}
      </div>
    </section>
  );
}
