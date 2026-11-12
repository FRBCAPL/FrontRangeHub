import React from 'react';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { DEFAULT_COMPLAINT_DAYS } from '../../utils/consignmentShipping.js';
import { shipRulesFromSettings } from '../../utils/consignmentShipPrice.js';
import { auctionEndHour, formatEndHour } from '../../utils/consignmentAuctionDates.js';
import ConsignmentSettingsSection from './ConsignmentSettingsSection.jsx';
import ConsignmentAuctionTimeSettings from './ConsignmentAuctionTimeSettings.jsx';
import ConsignmentTaxSettings, { taxPercentText } from './ConsignmentTaxSettings.jsx';
import ConsignmentAgreementSettings, { agreementsOutdated } from './ConsignmentAgreementSettings.jsx';
import ConsignmentShippingSettings from './ConsignmentShippingSettings.jsx';

function shippingHeader(settings) {
  if (!settings || !('shipping_enabled' in settings)) {
    return { summary: 'Not set up yet', badge: { tone: 'warn', text: 'Setup needed' } };
  }
  const on = Boolean(settings.shipping_enabled);
  const days = settings.shipping_complaint_days ?? DEFAULT_COMPLAINT_DAYS;
  const rules = shipRulesFromSettings(settings);
  const prices = 'shipping_base_rates' in settings
    ? `Cues from ${formatDollars(rules.baseRates.cues)} + insurance · `
    : '';
  return {
    summary: on ? `${prices}${days}-day problem window` : 'Buyers outside Colorado can’t have items shipped',
    badge: on ? { tone: 'on', text: 'On' } : { tone: 'off', text: 'Off' },
  };
}

/** Admin → Settings tab. Each section shows its current value and saves on its own. */
export default function ConsignmentSettingsPanel({ settings, error, onError, onSaved }) {
  if (!settings) return <p className="cs-lede">Loading settings…</p>;
  const ship = shippingHeader(settings);
  const outdated = agreementsOutdated(settings);

  return (
    <div className="cs-set-panel">
      <p className="cs-set-intro">Tap a section to open it. Each section saves separately.</p>
      {error ? <p className="cs-error" role="alert">{error}</p> : null}

      <ConsignmentSettingsSection
        icon="🚚"
        title="Shipping"
        summary={ship.summary}
        badge={ship.badge}
      >
        <ConsignmentShippingSettings settings={settings} onError={onError} onSaved={onSaved} />
      </ConsignmentSettingsSection>

      <ConsignmentSettingsSection
        icon="🧾"
        title="Sales tax"
        summary={`${taxPercentText(settings.tax_rate)}% added to the prices shoppers see`}
      >
        <ConsignmentTaxSettings settings={settings} onError={onError} onSaved={onSaved} />
      </ConsignmentSettingsSection>

      <ConsignmentSettingsSection
        icon="⏰"
        title="Auction end time"
        summary={`Every auction ends at ${formatEndHour(auctionEndHour(settings))} Colorado time (7 or 14 days)`}
      >
        <ConsignmentAuctionTimeSettings settings={settings} onError={onError} onSaved={onSaved} />
      </ConsignmentSettingsSection>

      <ConsignmentSettingsSection
        icon="📝"
        title="Seller agreements"
        summary="What sellers agree to on the Sell form (case and online auction)"
        badge={outdated ? { tone: 'warn', text: 'Needs review' } : null}
      >
        <ConsignmentAgreementSettings settings={settings} onError={onError} onSaved={onSaved} />
      </ConsignmentSettingsSection>
    </div>
  );
}
