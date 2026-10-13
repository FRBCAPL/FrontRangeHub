import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import { METHODS } from '../../data/duezyOptions.js';

/** Amount / method / note form for one team's week. Less than the dues saves as partial. */
export default function DuezyRecordPayment({ dues, weekName, payment, onSetPayment }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(payment?.method || METHODS[0]);
  const [note, setNote] = useState(payment?.note || '');

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
        <div className="dz-money-input">
          <em>$</em>
          <input type="number" inputMode="decimal" min="0" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(dues)} />
        </div>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={300} />
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={save} disabled={!(Number(amount) > 0)}>Save</button>
      </div>
      <p className="dz-small dz-muted">
        Less than {money(dues)} is saved as a partial payment. Duezy records payments you've collected — it doesn't move money.
        To fix a mistake, record the right amount or tap Not yet; the change and who made it stay in the payment history.
      </p>
    </>
  );
}
