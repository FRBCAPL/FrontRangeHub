import React, { useState } from 'react';
import DuezyTeamModal from './DuezyTeamModal.jsx';

/** "+ Add a team" button → add-team popup (one team or a pasted list), defaulting to the current division. */
export default function DuezyAddTeam({ divisions = [], divisionId = null, onAdd, onAddMany }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="dz-link dz-add-team" onClick={() => setOpen(true)}>+ Add a team</button>
      {open ? (
        <DuezyTeamModal
          divisions={divisions}
          divisionId={divisionId}
          onAdd={onAdd}
          onAddMany={onAddMany}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
