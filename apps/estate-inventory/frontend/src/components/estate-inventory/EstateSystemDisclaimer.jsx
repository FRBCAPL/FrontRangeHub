import React from 'react';
import { CASE_NUMBER } from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';

/**
 * Transparency footer — landing, logins, and heir portal.
 * @param {{ generic?: boolean }} props — when generic, omit a specific case number (case-entry gateway).
 */
const EstateSystemDisclaimer = ({ generic = false }) => {
  const { caseNumber } = useEstateCase();
  const caseLabel = generic ? null : caseNumber || CASE_NUMBER;

  return (
    <footer className="ei-system-disclaimer" role="note">
      <p>
        Data Layer: System Read-Only for Beneficiary Tiers. Stamped metadata, photo hashes, and audit
        history logs are locked directly to{' '}
        {caseLabel
          ? `El Paso County Court Case File ${caseLabel}`
          : 'the El Paso County Court Case File for the estate you open'}
        . Propelled by FRPL secure cloud infrastructure at zero administrative cost to the estate.
      </p>
    </footer>
  );
};

export default EstateSystemDisclaimer;
