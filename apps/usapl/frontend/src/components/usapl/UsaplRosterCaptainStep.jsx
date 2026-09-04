import React from 'react';
import UsaplPlayerFields from './UsaplPlayerFields.jsx';
import UsaplPreferredContact from './UsaplPreferredContact.jsx';

export default function UsaplRosterCaptainStep({ captain, onChange, listedTeam }) {
  return (
    <>
      <p className="usapl-lede">
        {listedTeam
          ? 'Confirm the captain. We need a way to reach them.'
          : 'Use the same captain name the office already has, so we can match the team.'}
      </p>
      <UsaplPlayerFields player={captain} onChange={onChange} requiredName />
      <UsaplPreferredContact
        value={captain.preferredContact || ''}
        onChange={(preferredContact) => onChange({ ...captain, preferredContact })}
      />
    </>
  );
}
