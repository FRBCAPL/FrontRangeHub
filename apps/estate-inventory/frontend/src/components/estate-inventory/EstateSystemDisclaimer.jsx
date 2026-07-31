import React from 'react';
import { ESTATE_DATA_TRUST_NOTE } from '@shared/utils/estateWhatIsVault.js';
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
        {ESTATE_DATA_TRUST_NOTE}
        {caseLabel ? <> Case {caseLabel}.</> : null} This is a private administration record — not a
        court filing system.
      </p>
    </footer>
  );
};

export default EstateSystemDisclaimer;
