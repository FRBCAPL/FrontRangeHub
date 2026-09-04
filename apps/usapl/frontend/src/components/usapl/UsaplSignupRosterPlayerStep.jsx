import React from 'react';
import UsaplPlayerFields from './UsaplPlayerFields.jsx';

export default function UsaplSignupRosterPlayerStep({
  player,
  playerNumber,
  title,
  lede,
  onChange,
  onRemove,
}) {
  return (
    <>
      <p className="usapl-lede">
        {lede || 'Optional. First and last name are enough for now. You can add the rest later.'}
      </p>
      <UsaplPlayerFields
        title={title || `Player ${playerNumber}`}
        player={player}
        onChange={onChange}
      />
      {onRemove ? (
        <button className="usapl-btn-secondary" type="button" onClick={onRemove}>
          Remove this player
        </button>
      ) : null}
    </>
  );
}
