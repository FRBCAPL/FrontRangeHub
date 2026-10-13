import React from 'react';
import { METHODS } from '../../data/duezyOptions.js';
import { PAY_HANDLES, defaultMethod, leagueMethods } from '../../utils/duezyLeaguePrefs.js';
import DuezyOtherMethods from './DuezyOtherMethods.jsx';

/**
 * How teams pay this league: free-text instructions, tap-to-pay handles, which methods the
 * dropdowns offer, and the method prefilled on amount and correction forms. `ready` = the preferences SQL has been run.
 */
export default function DuezyPaymentPrefs({ form, set, ready }) {
  const handles = form.pay_handles || {};
  const methods = leagueMethods(form);
  const toggle = (m) => {
    const next = methods.includes(m) ? methods.filter((x) => x !== m) : [...methods, m];
    if (next.length) set({ payment_methods: next });
  };

  return (
    <>
      <h2 className="dz-h3">How teams pay you</h2>
      {ready ? (
        <div className="dz-pay-handles">
          {PAY_HANDLES.map((h) => (
            <label key={h.key} className="dz-field">
              <span>{h.label}</span>
              <input
                value={handles[h.key] || ''}
                onChange={(e) => set({ pay_handles: { ...handles, [h.key]: e.target.value } })}
                placeholder={h.placeholder}
                maxLength={100}
              />
            </label>
          ))}
        </div>
      ) : null}
      <label className="dz-field">
        <span>Other payment instructions <em className="dz-muted">(optional)</em></span>
        <input
          value={form.payment_note}
          onChange={(e) => set({ payment_note: e.target.value })}
          placeholder="e.g. Cash at the table before the first game"
          maxLength={300}
        />
        <small className="dz-small dz-muted">
          {ready ? 'Added to reminder texts, with tap-to-pay links for the accounts above.' : 'Added to the end of reminder texts so teams know how to pay you.'}
        </small>
      </label>

      {ready ? (
        <>
          <div className="dz-field">
            <span>Methods you accept</span>
            <div className="dz-method-checks">
              {METHODS.map((m) => (
                <label key={m} className="dz-check-label">
                  <input type="checkbox" checked={methods.includes(m)} onChange={() => toggle(m)} disabled={methods.length === 1 && methods.includes(m)} />
                  {m}
                </label>
              ))}
            </div>
            <DuezyOtherMethods methods={methods} onChange={(next) => set({ payment_methods: next })} />
            <small className="dz-small dz-muted">
              Only these show up when recording a payment. Use Other for anything else you take, like a house tab or Square.
            </small>
          </div>
          <label className="dz-field">
            <span>Default method</span>
            <select value={defaultMethod(form)} onChange={(e) => set({ default_method: e.target.value })}>
              {methods.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <small className="dz-small dz-muted">Prefilled when you record a partial amount or correct a payment. The team row has a button for each method.</small>
          </label>
        </>
      ) : (
        <p className="dz-bill-hint">
          Tap-to-pay links, accepted methods and reminder sign-offs turn on after the
          <code> duezy-league-preferences</code> database update is run.
        </p>
      )}
    </>
  );
}
