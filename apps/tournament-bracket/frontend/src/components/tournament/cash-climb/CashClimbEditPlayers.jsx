import React from 'react';

export default function CashClimbEditPlayers({ playerNames, onChangeName }) {
  if (!playerNames?.length) return null;

  return (
    <section className="cc-edit-players">
      <h4>Players</h4>
      <p className="cc-edit-players-note">
        Fix spelling anytime. This does not change who played whom or prize money.
      </p>
      <ul className="cc-edit-player-list">
        {playerNames.map((row, index) => (
          <li key={row.id}>
            <input
              value={row.name}
              onChange={(e) => onChangeName(row.id, e.target.value)}
              autoComplete="off"
              aria-label={`Player ${index + 1} name`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
