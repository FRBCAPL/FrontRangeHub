import React, { useState } from 'react';
import UsaplDivisionFactsBody from './UsaplDivisionFactsBody.jsx';
import UsaplDivisionFactsModal from './UsaplDivisionFactsModal.jsx';
import UsaplFargoCapNotice from './UsaplFargoCapNotice.jsx';

export default function UsaplDivisionFacts({ division }) {
  const [open, setOpen] = useState(false);
  const title = division?.name || division?.shortName || 'Division details';

  return (
    <>
      <button type="button" className="usapl-btn-secondary" onClick={() => setOpen(true)}>
        Division details
      </button>
      {open ? (
        <UsaplDivisionFactsModal
          kicker="Division details"
          title={title}
          onClose={() => setOpen(false)}
        >
          <UsaplDivisionFactsBody division={division} />
          <UsaplFargoCapNotice division={division} />
        </UsaplDivisionFactsModal>
      ) : null}
    </>
  );
}
