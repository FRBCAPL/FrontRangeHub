import React, { useState } from 'react';
import { money, paidFor, round2 } from '../../utils/duezyMath.js';
import { defaultMethod, methodOptions } from '../../utils/duezyLeaguePrefs.js';
import { asksWhoPaid, payerChoice } from '../../utils/duezyPayers.js';
import { addPartEntry } from '../../utils/duezySplits.js';
import { keepPrepaid } from '../../utils/duezyMakeup.js';
import DuezyPayerSelect from './DuezyPayerSelect.jsx';

/**
 * Another payment for a week that already has money recorded (e.g. $78 cash at the table, $22 Venmo later).
 * The amount adds to what's there; each method is kept, so cash vs Venmo totals stay right.
 */
export default function DuezyAddPayment({ league, team, dues, weekName, payment, onSetPayment, onAddPlayer, onCancel }) {
  const recorded = paidFor(payment, dues);
  const remaining = Math.max(0, round2(dues - recorded));
  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : '');
  const [method, setMethod] = useState(defaultMethod(league));
  const [payer, setPayer] = useState({ pick: '', other: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const n = Number(amount);
  const valid = n > 0;
  const askPayer = Boolean(team) && asksWhoPaid(method);
  const after = round2(recorded + (valid ? n : 0));

  let hint = `${money(remaining)} still owed for ${weekName}.`;
  if (valid) hint = after >= dues ? `Brings ${weekName} to ${money(after)} — paid in full.` : `Brings ${weekName} to ${money(after)} — ${money(dues - after)} still owed.`;

  const save = async () => {
    if (!valid || saving) return;
    const who = askPayer ? payerChoice(payer, team) : { name: null, isNew: false };
    setSaving(true);
    setError('');
    try {
      await onSetPayment(keepPrepaid(payment, addPartEntry(payment, dues, { amount: n, method, paid_by: who.name })));
      if (who.isNew) onAddPlayer?.(who.name);
      onCancel?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dz-correct">
      <p className="dz-small"><strong>Add a payment for {weekName}</strong> <span className="dz-muted">· {money(recorded)} already recorded</span></p>
      <div className="dz-inline-form">
        <label className="dz-money-input">
          <span className="dz-sr-only">Amount</span>
          <em>$</em>
          <input type="number" inputMode="decimal" min="0" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
          {methodOptions(league, method).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {askPayer ? <DuezyPayerSelect team={team} value={payer} onChange={setPayer} /> : null}
      </div>
      <p className="dz-small dz-muted">{hint}</p>
      {error ? <p className="dz-error">{error}</p> : null}
      <div className="dz-row dz-row--start">
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={save} disabled={!valid || saving}>
          {saving ? 'Saving…' : valid ? `Add ${money(n)}` : 'Enter an amount'}
        </button>
        {onCancel ? <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={onCancel} disabled={saving}>Cancel</button> : null}
      </div>
    </div>
  );
}
