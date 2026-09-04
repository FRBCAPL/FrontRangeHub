import React from 'react';
import { usaplPersonName, usaplPreferredContactLabel } from '../../data/usaplContact.js';
import { labelUsaplDivisions } from '../../data/usaplDivisionIds.js';
import { usaplRosterModeLabel } from '../../data/usaplRosterSteps.js';

export default function UsaplInboxRosterDetail({ row, divisions }) {
  return (
    <>
      <p>
        {usaplRosterModeLabel(row.mode)}
        {' · '}
        {labelUsaplDivisions(row.division_id, divisions) || 'no division'}
      </p>
      <p>
        Captain: {usaplPersonName(row.captain)} · {row.captain?.email} · {row.captain?.phone}
        {row.captain?.preferredContact
          ? ` · Prefers ${usaplPreferredContactLabel(row.captain.preferredContact)}`
          : ''}
      </p>
      <ul>
        {(row.players || []).map((player, index) => (
          <li key={`${row.id}-${index}`}>
            {usaplPersonName(player)}
            {player.email ? ` · ${player.email}` : ''}
            {player.phone ? ` · ${player.phone}` : ''}
          </li>
        ))}
      </ul>
      <p className="usapl-meta">{row.created_at ? new Date(row.created_at).toLocaleString() : ''}</p>
    </>
  );
}
