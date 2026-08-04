import React from 'react';
import { EstateSettingsShell } from './EstateSettingsShell';
import EstateBillingBanner from './EstateBillingBanner';
import { estatePricingBlurbShort } from '@shared/utils/estateBilling.js';
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
        <EstateBillingBanner
          caseNumber={caseNumber}
          forceShow
          onMessage={onMessage}
        />
      </div>
    </EstateSettingsShell>
  );
};

export default EstateSettingsBillingModal;
