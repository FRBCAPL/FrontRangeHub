import React, { useEffect, useMemo, useState } from 'react';
import { saveShippingSettings } from '../../services/consignmentShippingAdminService.js';
import { DEFAULT_COMPLAINT_DAYS } from '../../utils/consignmentShipping.js';
import { shipRulesFromSettings } from '../../utils/consignmentShipPrice.js';
import ConsignmentShipRatesFields, { ratesFormToRules, rulesToRatesForm } from './ConsignmentShipRatesFields.jsx';
import { ConsignmentSettingsSaveBar } from './ConsignmentSettingsSection.jsx';

const formFrom = (settings) => ({
  enabled: Boolean(settings?.shipping_enabled),
  days: String(settings?.shipping_complaint_days ?? DEFAULT_COMPLAINT_DAYS),
  rates: rulesToRatesForm(shipRulesFromSettings(settings)),
});

/** Admin → Settings: the out-of-state shipping switch, automatic prices, and the buyer's window to report a problem. */
export default function ConsignmentShippingSettings({ settings, onError, onSaved }) {
  const ready = settings && 'shipping_enabled' in settings;
  const hasRates = Boolean(settings && 'shipping_base_rates' in settings);
  const baselineKey = JSON.stringify(formFrom(settings));
  const baseline = useMemo(() => JSON.parse(baselineKey), [baselineKey]);
  const [form, setForm] = useState(baseline);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm(baseline); }, [baseline]);

  const update = (patch) => { setForm((f) => ({ ...f, ...patch })); setSaved(false); };
  const dirty = JSON.stringify(form) !== baselineKey;

  async function save() {
    const n = Number(form.days);
    if (!Number.isInteger(n) || n < 1 || n > 14) { onError('The report-a-problem window must be 1 to 14 days.'); return; }
    const parsed = hasRates ? ratesFormToRules(form.rates) : { rules: null };
    if (parsed.error) { onError(parsed.error); return; }
    setBusy(true);
    try {
      await saveShippingSettings({ enabled: form.enabled, complaintDays: n, rules: parsed.rules });
      setSaved(true);
      onSaved?.();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <p className="cs-hint">Run supabase-migrations/consignment-shipping-2026-11.sql in the Supabase SQL editor to set this up.</p>;
  }

  return (
    <>
      <label className="cs-set-toggle">
        <input type="checkbox" checked={form.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        <span>
          <strong>{form.enabled ? 'Shipping is ON' : 'Shipping is OFF'}</strong>
          <span className="cs-hint">
            Buyers outside Colorado (lower 48 states and DC) can have items shipped. Only items you mark as shippable
            (Items tab → 🚚 Shipping button) can ship. Colorado buyers always pick up at Legends.
          </span>
        </span>
      </label>

      {hasRates ? (
        <ConsignmentShipRatesFields form={form.rates} onChange={(rates) => update({ rates })} />
      ) : (
        <p className="cs-hint">
          Run supabase-migrations/consignment-shipping-auto-price-2026-11.sql to turn on automatic shipping prices.
        </p>
      )}

      <div className="cs-set-group">
        <h3>{hasRates ? '3. ' : ''}Problems after delivery</h3>
        <p className="cs-set-inline">
          <label htmlFor="cs-ship-days">The buyer has</label>
          <input
            id="cs-ship-days"
            type="number"
            min="1"
            max="14"
            step="1"
            value={form.days}
            onChange={(e) => update({ days: e.target.value })}
          />
          days after delivery to report a problem.
        </p>
        <p className="cs-hint">You can pay the seller once this window has passed.</p>
      </div>

      <ConsignmentSettingsSaveBar
        dirty={dirty}
        busy={busy}
        saved={saved && !dirty}
        onSave={save}
        onReset={() => setForm(baseline)}
        label="Save shipping settings"
      />
    </>
  );
}
