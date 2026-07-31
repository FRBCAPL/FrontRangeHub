import React from 'react';
import { useEstateCase } from './EstateCaseContext';

/**
 * Transparency footer — landing, logins, and heir portal.
 * @param {{ generic?: boolean }} props — when generic, omit a specific case number (case-entry gateway).
 */
const EstateSystemDisclaimer = ({ generic = false }) => {
  const { caseNumber } = useEstateCase();
  const caseLabel = generic ? null : caseNumber || null;

  return (
    <footer className="ei-system-disclaimer" role="note">
      <p>
        Estate data is kept separately and access is limited by role
        {caseLabel ? <> (case {caseLabel})</> : null}
        . Important Personal Representative actions are recorded in the estate history and can be
        exported for review with family or counsel. This is a private administration record — not a
        court filing system.
      </p>
    </footer>
  );
};

export default EstateSystemDisclaimer;
