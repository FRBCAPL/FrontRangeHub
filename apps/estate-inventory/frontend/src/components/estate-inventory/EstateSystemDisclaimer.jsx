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
        Data Layer: System Read-Only for Beneficiary Tiers. Stamped metadata, photo hashes, and audit
        history logs are retained for this estate
        {caseLabel ? <> and keyed to Case No. {caseLabel}</> : null}
        , supporting orderly estate administration consistent with probate practice. Secured on
        dedicated cloud infrastructure for Estate Vault.
      </p>
    </footer>
  );
};

export default EstateSystemDisclaimer;
