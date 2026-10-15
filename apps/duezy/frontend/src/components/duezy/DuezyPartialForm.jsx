import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import { defaultMethod, methodOptions } from '../../utils/duezyLeaguePrefs.js';
import { asksWhoPaid, payerChoice } from '../../utils/duezyPayers.js';
import DuezyPayerSelect from './DuezyPayerSelect.jsx';

/** Partial popup body: amount first (focused), live "still owed", then method / who paid / note. */
export default function DuezyPartialForm({ league, team, dues, onSetPayment, onAddPlayer }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(defaultMethod(league));
  const [payer, setPayer] = useState({ pick: '', other: '' });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const n = Number(amount);
  const valid = n > 0;
  const full = valid && n >= dues;
  const askPayer = Boolean(team) && asksWhoPaid(method);

  const save = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!valid || saving) return;
    const who = askPayer ? payerChoice(payer, team) : { name: null, isNew: false };
    setSaving(true);
    try {
      await onSetPayment({ status: full ? 'paid' : 'partial', amount: n, method, note: note.trim() || null, paid_by: who.name });
      if (who.isNew) onAddPlayer?.(who.name);
    } finally {
      setSaving(false);
    }
  };

  let hint = `Dues are ${money(dues)} this week.`;
  if (valid) hint = full ? `That covers the full ${money(dues)} — it will save as paid.` : `${money(dues - n)} still owed after this.`;

  return (
    <form className="dz-partial-form" onSubmit={save}>
      <label className="dz-partial-amount">
        <span>Amount paid</span>
        <span className="dz-money-input">
          <em>$</em>
          <input
            type="number" inputMode="decimal" min="0" step="0.5" autoFocus
            value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
          />
        </span>
        <small className={full ? 'is-full' : ''}>{hint}</small>
      </label>
      <label>
        <span>Method</span>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          {methodOptions(league, method).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      {askPayer ? <DuezyPayerSelect team={team} value={payer} onChange={setPayer} /> : null}
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={300} aria-label="Note" />
      <button type="submit" className="dz-btn dz-btn--primary" disabled={!valid || saving}>
        {valid ? `Save ${money(n)} ${full ? 'payment' : 'partial'}` : 'Enter an amount'}
      </button>
    </form>
  );
}
