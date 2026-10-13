import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import { hasRecordedEntry } from '../../utils/duezyCorrection.js';
import { defaultMethod, methodOptions } from '../../utils/duezyLeaguePrefs.js';
import DuezyCorrectPayment from './DuezyCorrectPayment.jsx';

/**
 * Amount / method / note form for one team's week. Less than the dues saves as partial.
 * A week that already has money recorded gets "Correct this entry" instead of a second payment form.
 */
export default function DuezyRecordPayment({ league, dues, weekName, payment, onSetPayment, startCorrect = false }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(payment?.method || defaultMethod(league));
  const [note, setNote] = useState(payment?.note || '');

  if (hasRecordedEntry(payment)) {
    return <DuezyCorrectPayment league={league} dues={dues} weekName={weekName} payment={payment} onSetPayment={onSetPayment} startOpen={startCorrect} />;
  }

  const save = () => {
    const n = Number(amount);
    if (!(n > 0)) return;
    onSetPayment({ status: n >= dues ? 'paid' : 'partial', amount: n, method, note: note.trim() || null });
    setAmount('');
  };

  return (
    <>
      <p className="dz-small dz-muted">Record a payment for {weekName}</p>
      <div className="dz-inline-form">
        <label className="dz-money-input">
          <span className="dz-sr-only">Amount</span>
          <em>$</em>
          <input type="number" inputMode="decimal" min="0" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(dues)} />
        </label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
          {methodOptions(league, method).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={300} aria-label="Note" />
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={save} disabled={!(Number(amount) > 0)}>Save</button>
      </div>
      <p className="dz-small dz-muted">
        Less than {money(dues)} is saved as a partial payment. Duezy keeps a record of dues you've collected — it doesn't move money.
      </p>
    </>
  );
}
