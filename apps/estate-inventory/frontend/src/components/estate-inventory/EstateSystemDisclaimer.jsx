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
        history logs are retained for this estate and keyed to{' '}
        {caseLabel
          ? `El Paso County Case No. ${caseLabel}`
          : 'the El Paso County case number for the estate you open'}
        , supporting orderly estate administration consistent with probate practice. Secured on
        dedicated cloud infrastructure for Estate Vault.
      </p>
    </footer>
  );
};

export default EstateSystemDisclaimer;
