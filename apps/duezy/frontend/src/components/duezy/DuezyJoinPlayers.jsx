import React, { useState } from 'react';
import DuezyJoinPlayerModal from './DuezyJoinPlayerModal.jsx';

const MAX_PLAYERS = 30;

/** Players on the sign-up form: the roster already on file (existing team), the ones added here, and "+ Add player". */
export default function DuezyJoinPlayers({ players, roster = [], onChange }) {
  const [adding, setAdding] = useState(false);
  const full = roster.length + players.length >= MAX_PLAYERS;

  return (
    <div className="dz-field dz-join-players">
      <span>
        {roster.length ? 'Players to add' : 'Players'} <em className="dz-muted">(optional)</em>
      </span>
      {roster.length ? <p className="dz-small dz-muted">Already on the roster: {roster.join(', ')}</p> : null}
      {players.length ? (
        <ul className="dz-join-player-list">
          {players.map((p) => (
            <li key={p}>
              {p}
              <button type="button" onClick={() => onChange(players.filter((x) => x !== p))} aria-label={`Remove ${p}`}>×</button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm dz-join-add-player" onClick={() => setAdding(true)} disabled={full}>
        + Add player
      </button>
      {adding ? (
        <DuezyJoinPlayerModal
          taken={[...roster, ...players]}
          onAdd={(name) => onChange([...players, name].slice(0, MAX_PLAYERS - roster.length))}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </div>
  );
}
