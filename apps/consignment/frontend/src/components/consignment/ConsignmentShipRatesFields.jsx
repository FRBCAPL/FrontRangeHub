import React from 'react';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { SHIP_CATEGORIES, shipPriceFor } from '../../utils/consignmentShipPrice.js';

/** Form values (strings) → rules, or an error message. */
export function ratesFormToRules(form) {
  const baseRates = {};
  for (const [key, label] of SHIP_CATEGORIES) {
    const n = Number(form.baseRates[key]);
    if (!(n > 0 && n <= 300)) return { error: `${label}: enter a shipping price from $1 to $300.` };
    baseRates[key] = Math.round(n * 100) / 100;
  }
  const insurancePer100 = Number(form.insurancePer100);
  if (!(insurancePer100 >= 0 && insurancePer100 <= 20)) return { error: 'Insurance per $100 must be $0 to $20.' };
  const includedCoverage = Number(form.includedCoverage);
  if (!(includedCoverage >= 0 && includedCoverage <= 5000)) return { error: 'The insurance the label includes must be $0 to $5,000.' };
  return { rules: { baseRates, insurancePer100, includedCoverage } };
}

export const rulesToRatesForm = (rules) => ({
  baseRates: Object.fromEntries(SHIP_CATEGORIES.map(([key]) => [key, String(rules.baseRates[key])])),
  insurancePer100: String(rules.insurancePer100),
  includedCoverage: String(rules.includedCoverage),
});

const SAMPLE = 300;
const CUE_EXAMPLES = [100, 300, 800, 2000];

/** Admin → Settings → Shipping: automatic price per category plus insurance. form/onChange use strings. */
export default function ConsignmentShipRatesFields({ form, onChange }) {
  const setBase = (key, v) => onChange({ ...form, baseRates: { ...form.baseRates, [key]: v } });
  const { rules } = ratesFormToRules(form);
  const at = (category, value) => (rules ? formatDollars(shipPriceFor({ category, value }, rules)) : '…');

  return (
    <>
      <div className="cs-set-group">
        <h3>1. Starting price for each kind of item</h3>
        <p className="cs-hint">What it costs you to box and ship it: the label, box or tube, and packing.</p>
        <table className="cs-set-rates">
          <thead>
            <tr><th>Item type</th><th>Starting price</th><th>A {formatDollars(SAMPLE)} sale ships for</th></tr>
          </thead>
          <tbody>
            {SHIP_CATEGORIES.map(([key, label]) => (
              <tr key={key}>
                <td><label htmlFor={`cs-ship-base-${key}`}>{label}</label></td>
                <td>
                  <span className="cs-set-money">
                    $
                    <input
                      id={`cs-ship-base-${key}`}
                      type="number"
                      min="1"
                      max="300"
                      step="1"
                      value={form.baseRates[key]}
                      onChange={(e) => setBase(key, e.target.value)}
                    />
                  </span>
                </td>
                <td>{at(key, SAMPLE)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cs-set-group">
        <h3>2. Insurance (added automatically for pricier items)</h3>
        <p className="cs-set-inline">
          Add
          <span className="cs-set-money">
            $
            <input
              type="number"
              min="0"
              max="20"
              step="0.05"
              aria-label="Insurance cost per $100"
              value={form.insurancePer100}
              onChange={(e) => onChange({ ...form, insurancePer100: e.target.value })}
            />
          </span>
          for every $100 of the sale price above
          <span className="cs-set-money">
            $
            <input
              type="number"
              min="0"
              max="5000"
              step="1"
              aria-label="Insurance the shipping label already includes"
              value={form.includedCoverage}
              onChange={(e) => onChange({ ...form, includedCoverage: e.target.value })}
            />
          </span>
        </p>
        <p className="cs-hint">
          USPS Ground Advantage labels already include $100 of insurance, so leave that at $100. Extra insurance costs about
          $1.50 to $2 per $100. The total is always rounded up to the next $5.
        </p>
        <div className="cs-set-example">
          <strong>Cue examples:</strong>{' '}
          {CUE_EXAMPLES.map((v) => `${formatDollars(v)} sale → ${at('cues', v)} shipping`).join(' · ')}
        </div>
      </div>
    </>
  );
}
