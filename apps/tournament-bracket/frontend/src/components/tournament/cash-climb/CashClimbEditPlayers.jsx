import React from 'react';
import { capitalizePlayerName } from './cashClimbRename.js';

export default function CashClimbEditPlayers({ playerNames, onChangeName }) {
  if (!playerNames?.length) return null;

  return (
    <section className="cc-edit-pane cc-edit-players" aria-labelledby="cc-edit-players-heading">
      <h4 id="cc-edit-players-heading">Players</h4>
      <p className="cc-edit-players-note">
        Fix spelling. This does not change who played whom or prize money.
      </p>
      <ul className="cc-edit-player-list">
        {playerNames.map((row, index) => (
          <li key={row.id}>
            <span className="cc-edit-player-num" aria-hidden="true">{index + 1}</span>
            <input
              value={row.name}
              onChange={(e) => onChangeName(row.id, capitalizePlayerName(e.target.value))}
              autoComplete="off"
              aria-label={`Player ${index + 1} name`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
