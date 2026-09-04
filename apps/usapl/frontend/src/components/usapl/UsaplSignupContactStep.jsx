import React from 'react';
import UsaplPlayerFields from './UsaplPlayerFields.jsx';
import UsaplPreferredContact from './UsaplPreferredContact.jsx';

export default function UsaplSignupContactStep({
  player,
  onChange,
  showCaptain,
  isCaptain,
  onCaptain,
}) {
  return (
    <>
      <UsaplPlayerFields title="Your info" player={player} onChange={onChange} requiredName />
      <UsaplPreferredContact
        value={player.preferredContact || ''}
        onChange={(preferredContact) => onChange({ ...player, preferredContact })}
      />
      {showCaptain ? (
        <label className="usapl-signup-roster-toggle">
          <input
            type="checkbox"
            checked={isCaptain}
            onChange={(event) => onCaptain(event.target.checked)}
          />
          I am the team captain
        </label>
      ) : null}
    </>
  );
}
