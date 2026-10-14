import React, { useState } from 'react';
import DuezyModal from './DuezyModal.jsx';
import DuezyTeamUpload from './DuezyTeamUpload.jsx';

/**
 * Setup wizard: "Upload a spreadsheet" → the same upload flow as the team popup.
 * `divisions` [{ id, name }] (draft keys as ids) routes a Division column; `onImport(teams)` gets each team's division_id.
 */
export default function DuezyWizardUpload({ divisions = [], fallbackName = '', existingNames = [], onImport }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm dz-wizard-upload" onClick={() => setOpen(true)}>
        📄 Upload a spreadsheet
      </button>
      {open ? (
        <DuezyModal title="Upload your teams" onClose={() => setOpen(false)} className="dz-team-modal">
          <DuezyTeamUpload
            divisions={divisions}
            fallbackName={fallbackName}
            existingNames={existingNames}
            onImport={(teams) => { onImport(teams); setOpen(false); }}
            onCancel={() => setOpen(false)}
          >
            {divisions.length > 1 && fallbackName ? (
              <p className="dz-team-modal-hint">Teams without a division go to {fallbackName}.</p>
            ) : null}
          </DuezyTeamUpload>
        </DuezyModal>
      ) : null}
    </>
  );
}
