import React from 'react';
import { EstateSettingsShell } from './EstateSettingsShell';
import EstateBillingBanner from './EstateBillingBanner';
import { estatePricingBlurbShort } from '@shared/utils/estateBilling.js';
import { ESTATE_LEGAL_PAGES } from '@shared/utils/estateLegalPages.js';
import { useEstateCase } from './EstateCaseContext';

const EstateSettingsBillingModal = ({ open, onClose, onMessage }) => {
  const { caseNumber } = useEstateCase();
  if (!open) return null;

  return (
    <EstateSettingsShell
      open
      onClose={onClose}
      title="Billing"
      titleId="ei-settings-billing-title"
      foot={
        <button type="button" className="ei-btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="ei-modal-body">
        <p className="ei-settings-hint" style={{ marginTop: 0 }}>
          Estate Vault is billed <strong>per estate</strong>. {estatePricingBlurbShort()} Cancel in
          the Stripe customer portal when you close an estate.
        </p>
        <p className="ei-settings-hint">
          By subscribing you agree to our{' '}
          <a href={ESTATE_LEGAL_PAGES.terms.path} target="_blank" rel="noopener noreferrer">
            {ESTATE_LEGAL_PAGES.terms.label}
          </a>{' '}
          and{' '}
          <a href={ESTATE_LEGAL_PAGES.privacy.path} target="_blank" rel="noopener noreferrer">
            {ESTATE_LEGAL_PAGES.privacy.label}
          </a>
          . Also see{' '}
          <a href={ESTATE_LEGAL_PAGES.refund.path} target="_blank" rel="noopener noreferrer">
            {ESTATE_LEGAL_PAGES.refund.label}
          </a>{' '}
          and{' '}
          <a href={ESTATE_LEGAL_PAGES.security.path} target="_blank" rel="noopener noreferrer">
            {ESTATE_LEGAL_PAGES.security.label}
          </a>
          .
        </p>
        <EstateBillingBanner caseNumber={caseNumber} forceShow onMessage={onMessage} />
      </div>
    </EstateSettingsShell>
  );
};

export default EstateSettingsBillingModal;
