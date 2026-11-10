import React from 'react';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { SHIP_CATEGORIES, shipPriceFor } from '../../utils/consignmentShipPrice.js';
import './consignment-shipping.css';

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
  if (!(includedCoverage >= 0 && includedCoverage <= 5000)) return { error: 'Included coverage must be $0 to $5,000.' };
  return { rules: { baseRates, insurancePer100, includedCoverage } };
}

export const rulesToRatesForm = (rules) => ({
  baseRates: Object.fromEntries(SHIP_CATEGORIES.map(([key]) => [key, String(rules.baseRates[key])])),
  insurancePer100: String(rules.insurancePer100),
  includedCoverage: String(rules.includedCoverage),
});

const EXAMPLES = [300, 800, 2000];

/** Admin → Settings → Shipping: automatic price per category plus insurance. form/onChange use strings. */
export default function ConsignmentShipRatesFields({ form, onChange }) {
  const setBase = (key, v) => onChange({ ...form, baseRates: { ...form.baseRates, [key]: v } });
  const { rules } = ratesFormToRules(form);

  return (
    <fieldset className="cs-field cs-ship-rates">
      <legend>Automatic shipping prices</legend>
      <p className="cs-hint">
        Price = the category price below + insurance on the sale price, rounded up to the next $5. Items set to a fixed
        price (Items → 🚚) ignore this.
      </p>
      <div className="cs-ship-rates-grid">
        {SHIP_CATEGORIES.map(([key, label]) => (
          <label key={key}>
            <span>{label} ($)</span>
            <input type="number" min="1" max="300" step="1" value={form.baseRates[key]} onChange={(e) => setBase(key, e.target.value)} />
          </label>
        ))}
        <label>
          <span>Insurance per $100 ($)</span>
          <input
            type="number"
            min="0"
            max="20"
            step="0.05"
            value={form.insurancePer100}
            onChange={(e) => onChange({ ...form, insurancePer100: e.target.value })}
          />
        </label>
        <label>
          <span>Insurance the label already includes ($)</span>
          <input
            type="number"
            min="0"
            max="5000"
            step="1"
            value={form.includedCoverage}
            onChange={(e) => onChange({ ...form, includedCoverage: e.target.value })}
          />
        </label>
      </div>
      {rules ? (
        <p className="cs-hint">
          A cue sold for {EXAMPLES.map((v) => `${formatDollars(v)} ships for ${formatDollars(shipPriceFor({ category: 'cues', value: v }, rules))}`).join(', ')}.
        </p>
      ) : null}
    </fieldset>
  );
}
