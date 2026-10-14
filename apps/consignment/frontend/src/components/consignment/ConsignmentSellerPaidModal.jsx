import React, { useState } from 'react';
import { itemLabel, PAYMENT_METHODS } from '../../data/consignmentConstants.js';
import { markSellerPaid } from '../../services/consignmentPayoutService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { middayFromDateInput, toDateInput } from '../../utils/consignmentFormValues.js';
import ConsignmentModal from './ConsignmentModal.jsx';

export default function ConsignmentSellerPaidModal({ item, onClose }) {
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [day, setDay] = useState(() => toDateInput(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await markSellerPaid(item.id, { method, paidAt: middayFromDateInput(day) });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConsignmentModal titleId="cs-paid-title" onClose={onClose} busy={busy}>
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-paid-title">Seller paid · {itemLabel(item)}</h2>
        <p className="cs-hint">
          Pay <strong>{item.seller?.full_name || 'the seller'}</strong>{' '}
          <strong>{formatDollars(item.seller_payout_paid ?? item.seller_payout)}</strong>.
        </p>
        <div className="cs-row">
          <div className="cs-field">
            <label htmlFor="cs-seller-paid-f1">Paid with</label>
            <select id="cs-seller-paid-f1" value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="cs-field">
            <label htmlFor="cs-seller-paid-f2">Date paid</label>
            <input id="cs-seller-paid-f2" type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
          </div>
        </div>
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Mark seller paid'}</button>
          <button className="cs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </ConsignmentModal>
  );
}
