import React, { useState } from 'react';
import DuezyTeamModal from './DuezyTeamModal.jsx';

/** "+ Add teams" button → add-team popup (one team, a pasted list or a spreadsheet), defaulting to the current division. */
export default function DuezyAddTeam({ divisions = [], divisionId = null, existingNames = [], sport = '', singles = false, words, onAdd, onAddMany }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="dz-link dz-add-team" onClick={() => setOpen(true)}>+ Add {words?.many || 'teams'}</button>
      {open ? (
        <DuezyTeamModal
          divisions={divisions}
          divisionId={divisionId}
          existingNames={existingNames}
          sport={sport}
          singles={singles}
          onAdd={onAdd}
          onAddMany={onAddMany}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
