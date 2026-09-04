import React from 'react';
import UsaplPlayerFields from './UsaplPlayerFields.jsx';

export default function UsaplSignupRosterPlayerStep({
  player,
  playerNumber,
  onChange,
}) {
  return (
    <>
      <p className="usapl-lede">
        Optional. First and last name are enough for now. You can add the rest later.
      </p>
      <UsaplPlayerFields
        title={`Player ${playerNumber}`}
        player={player}
        onChange={onChange}
      />
    </>
  );
}
