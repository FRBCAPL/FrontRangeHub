import React, { useEffect, useState } from 'react';
import { saveShippingSettings } from '../../services/consignmentShippingAdminService.js';
import { DEFAULT_COMPLAINT_DAYS } from '../../utils/consignmentShipping.js';
import { shipRulesFromSettings } from '../../utils/consignmentShipPrice.js';
import ConsignmentShipRatesFields, { ratesFormToRules, rulesToRatesForm } from './ConsignmentShipRatesFields.jsx';

/** Admin → Settings: the out-of-state shipping switch, automatic prices, and the buyer's window to report a problem. */
export default function ConsignmentShippingSettings({ settings, onError, onSaved }) {
  const ready = settings && 'shipping_enabled' in settings;
  const hasRates = Boolean(settings && 'shipping_base_rates' in settings);
  const [enabled, setEnabled] = useState(Boolean(settings?.shipping_enabled));
  const [days, setDays] = useState(String(settings?.shipping_complaint_days ?? DEFAULT_COMPLAINT_DAYS));
  const [rates, setRates] = useState(() => rulesToRatesForm(shipRulesFromSettings(settings)));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEnabled(Boolean(settings?.shipping_enabled));
    setDays(String(settings?.shipping_complaint_days ?? DEFAULT_COMPLAINT_DAYS));
    setRates(rulesToRatesForm(shipRulesFromSettings(settings)));
  }, [settings]);

  async function save() {
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1 || n > 14) { onError('The report-a-problem window must be 1 to 14 days.'); return; }
    const parsed = hasRates ? ratesFormToRules(rates) : { rules: null };
    if (parsed.error) { onError(parsed.error); return; }
    setBusy(true);
    setSaved(false);
    try {
      await saveShippingSettings({ enabled, complaintDays: n, rules: parsed.rules });
      setSaved(true);
      onSaved?.();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="cs-sellbox cs-ship-settings" style={{ marginBottom: 16 }} open>
      <summary><strong>Shipping</strong> (out-of-state buyers)</summary>
      {!ready ? (
        <p className="cs-hint">Run supabase-migrations/consignment-shipping-2026-11.sql in the Supabase SQL editor to set this up.</p>
      ) : (
        <>
          <label className="cs-check">
            <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setSaved(false); }} />
            <span>
              Offer shipping to buyers outside Colorado (lower 48 states and DC). Only items you mark as shippable
              (Items → 🚚 Shipping) can ship. Colorado buyers always pick up at Legends.
            </span>
          </label>
          {hasRates ? (
            <ConsignmentShipRatesFields form={rates} onChange={(next) => { setRates(next); setSaved(false); }} />
          ) : (
            <p className="cs-hint">
              Run supabase-migrations/consignment-shipping-auto-price-2026-11.sql to turn on automatic shipping prices.
            </p>
          )}
          <div className="cs-field">
            <label htmlFor="cs-ship-days">Days the buyer has to report a problem after delivery</label>
            <input
              id="cs-ship-days"
              type="number"
              min="1"
              max="14"
              step="1"
              value={days}
              onChange={(e) => { setDays(e.target.value); setSaved(false); }}
            />
            <p className="cs-hint">The seller can be marked paid once this window ends after delivery.</p>
          </div>
          <div className="cs-actions">
            <button type="button" className="cs-btn-secondary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            {saved ? <span className="cs-hint">Saved.</span> : null}
          </div>
        </>
      )}
    </details>
  );
}
