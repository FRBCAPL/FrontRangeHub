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
        Family and helper access is limited compared with the Personal Representative. Photo details
        and activity history can be kept for this estate
        {caseLabel ? <> (case {caseLabel})</> : null}
        . This is a private administration record — not a court filing system.
      </p>
    </footer>
  );
};

export default EstateSystemDisclaimer;
