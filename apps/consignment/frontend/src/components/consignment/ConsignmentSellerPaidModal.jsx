import React, { useState } from 'react';
import { PAYMENT_METHODS } from '../../data/consignmentConstants.js';
import { markSellerPaid } from '../../services/consignmentPayoutService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

function todayInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ConsignmentSellerPaidModal({ item, onClose }) {
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [day, setDay] = useState(todayInput());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const [y, m, d] = day.split('-').map(Number);
      await markSellerPaid(item.id, { method, paidAt: new Date(y, m - 1, d, 12).toISOString() });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-paid-title">
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-paid-title">Seller paid · {item.item_number}</h2>
        <p className="cs-hint">
          Pay <strong>{item.seller?.full_name || 'the seller'}</strong>{' '}
          <strong>{formatDollars(item.seller_payout_paid ?? item.seller_payout)}</strong>.
        </p>
        <div className="cs-row">
          <div className="cs-field">
            <label>Paid with</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="cs-field">
            <label>Date paid</label>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
          </div>
        </div>
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Mark seller paid'}</button>
          <button className="cs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
