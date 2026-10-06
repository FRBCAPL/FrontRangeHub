import React, { useState } from 'react';
import { FEE_KINDS, PAYMENT_METHODS, feeKindLabel } from '../../data/consignmentConstants.js';
import { deleteFee, recordFee } from '../../services/consignmentFeesService.js';
import { feesTotal, formatDollars } from '../../utils/consignmentMoney.js';
import { formatShortDate } from '../../utils/consignmentDates.js';

/** Fee history for one item. Changes save immediately (separate from the edit form's Save). */
export default function ConsignmentFeesPanel({ item, defaultFee }) {
  const [fees, setFees] = useState(item.fees || []);
  const [kind, setKind] = useState('consignment');
  const [amount, setAmount] = useState(defaultFee);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async () => {
    setBusy(true);
    setError('');
    try {
      const row = await recordFee(item.id, { kind, amount, paymentMethod: method });
      setFees((prev) => [...prev, row]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (fee) => {
    if (!window.confirm(`Delete this ${formatDollars(fee.amount)} fee record?`)) return;
    setBusy(true);
    setError('');
    try {
      await deleteFee(fee.id);
      setFees((prev) => prev.filter((f) => f.id !== fee.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-field cs-fees">
      <label>Fees paid ({formatDollars(feesTotal(fees))})</label>
      {fees.length ? (
        <ul className="cs-fee-list">
          {fees.map((fee) => (
            <li key={fee.id}>
              <span>
                {formatShortDate(fee.paid_at)} · {feeKindLabel(fee.kind)} · {formatDollars(fee.amount)}
                {fee.payment_method ? ` · ${fee.payment_method}` : ''}
              </span>
              <button type="button" onClick={() => remove(fee)} disabled={busy} aria-label="Delete fee">✕</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cs-hint">No fees recorded.</p>
      )}
      <div className="cs-fee-add">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Fee type">
          {FEE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
        <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button type="button" className="cs-btn-secondary" onClick={add} disabled={busy || amount === ''}>Record fee</button>
      </div>
      <p className="cs-hint">Fee records save right away. Use Renew on the admin list to extend the 30 days.</p>
      {error ? <p className="cs-error">{error}</p> : null}
    </div>
  );
}
