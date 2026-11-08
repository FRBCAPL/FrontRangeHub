import React, { useEffect, useState } from 'react';
import { saveTaxRate } from '../../services/consignmentService.js';
import { setTaxRate } from '../../hooks/useTaxRate.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { normalizeTaxRate, withTax } from '../../utils/consignmentTax.js';

const toPercent = (rate) => String(Math.round(normalizeTaxRate(rate) * 100000) / 1000);

/** Admin → Settings: the sales tax rate shoppers see added to prices (display only). */
export default function ConsignmentTaxSettings({ settings, onError }) {
  const [pct, setPct] = useState(() => toPercent(settings?.tax_rate));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setPct(toPercent(settings?.tax_rate)); }, [settings?.tax_rate]);

  const value = Number(pct);
  const valid = pct.trim() !== '' && Number.isFinite(value) && value >= 0 && value < 20;

  async function save() {
    if (!valid) { onError('Enter a tax rate from 0 to 19.99 (for example 8.25).'); return; }
    setBusy(true);
    setSaved(false);
    try {
      const rate = Math.round(value * 1000) / 100000;
      await saveTaxRate(rate);
      setTaxRate(rate);
      setSaved(true);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="cs-sellbox" style={{ marginBottom: 16 }} open>
      <summary><strong>Sales tax</strong> (added to prices shoppers see)</summary>
      <div className="cs-field">
        <label htmlFor="cs-tax-rate">Sales tax rate at Legends (%)</label>
        <input
          id="cs-tax-rate"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          max="19.99"
          value={pct}
          onChange={(e) => { setPct(e.target.value); setSaved(false); }}
          style={{ maxWidth: 160 }}
        />
        <p className="cs-hint">
          Shoppers see totals with tax, for example a $100 item shows {valid ? formatDollars(withTax(100, value / 100)) : '…'}.
          Prices, offers, bids, payouts and commission stay before tax.
        </p>
      </div>
      <div className="cs-actions">
        <button type="button" className="cs-btn-secondary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        {saved ? <span className="cs-hint">Saved.</span> : null}
      </div>
    </details>
  );
}
