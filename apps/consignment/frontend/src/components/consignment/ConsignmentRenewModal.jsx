import React, { useState } from 'react';
import { PAYMENT_METHODS } from '../../data/consignmentConstants.js';
import { renewItem } from '../../services/consignmentFeesService.js';
import { formatShortDate, renewedExpiry } from '../../utils/consignmentDates.js';

export default function ConsignmentRenewModal({ item, defaultFee, consignmentDays, onClose }) {
  const [amount, setAmount] = useState(defaultFee);
  const [days, setDays] = useState(consignmentDays);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const newEnd = renewedExpiry(item.expires_at, Number(days) || 0);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await renewItem(item, { amount, days: Number(days), paymentMethod: method });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-renew-title">
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-renew-title">Renew {item.item_number}</h2>
        <p className="cs-hint">
          Currently ends {formatShortDate(item.expires_at)}. Renewing records the fee
          {item.status === 'expired' ? ' and puts the item back in the shop' : ''}.
        </p>
        <div className="cs-row">
          <div className="cs-field">
            <label>Renewal fee ($)</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="cs-field">
            <label>Days</label>
            <input type="number" step="1" min="1" value={days} onChange={(e) => setDays(e.target.value)} required />
          </div>
        </div>
        <div className="cs-field">
          <label>Payment method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <p className="cs-hint">New end date: <strong>{formatShortDate(newEnd)}</strong></p>
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Renew'}</button>
          <button className="cs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
