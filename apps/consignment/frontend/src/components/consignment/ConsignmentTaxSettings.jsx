import React, { useEffect, useState } from 'react';
import { saveTaxRate } from '../../services/consignmentService.js';
import { setTaxRate } from '../../hooks/useTaxRate.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { normalizeTaxRate, withTax } from '../../utils/consignmentTax.js';
import { ConsignmentSettingsSaveBar } from './ConsignmentSettingsSection.jsx';

export const taxPercentText = (rate) => String(Math.round(normalizeTaxRate(rate) * 100000) / 1000);

/** Admin → Settings: the sales tax rate shoppers see added to prices (display only). */
export default function ConsignmentTaxSettings({ settings, onError, onSaved }) {
  const [baseline, setBaseline] = useState(() => taxPercentText(settings?.tax_rate));
  const [pct, setPct] = useState(baseline);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const next = taxPercentText(settings?.tax_rate);
    setBaseline(next);
    setPct(next);
  }, [settings?.tax_rate]);

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
      setBaseline(pct);
      setSaved(true);
      onSaved?.();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="cs-set-group">
        <label className="cs-set-inline" htmlFor="cs-tax-rate">
          Sales tax rate at Legends:
          <span className="cs-set-money">
            <input
              id="cs-tax-rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="19.99"
              value={pct}
              onChange={(e) => { setPct(e.target.value); setSaved(false); }}
            />
            %
          </span>
        </label>
        <p className="cs-set-example">
          Example: a {formatDollars(100)} item shows as <strong>{valid ? formatDollars(withTax(100, value / 100)) : '…'}</strong> with tax.
        </p>
        <p className="cs-hint">
          This only changes the totals shoppers see. Prices, offers, bids, seller payouts and commission are always before tax.
        </p>
      </div>
      <ConsignmentSettingsSaveBar
        dirty={pct !== baseline}
        busy={busy}
        saved={saved}
        onSave={save}
        onReset={() => setPct(baseline)}
      />
    </>
  );
}
