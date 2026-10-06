import React, { useState } from 'react';
import { PAYMENT_METHODS } from '../../data/consignmentConstants.js';
import { feesTotal, formatDollars, frplRevenue, priceWithTaxLabel } from '../../utils/consignmentMoney.js';

export default function ConsignmentSoldModal({ item, onClose, onSave }) {
  const [actual, setActual] = useState(item.selling_price);
  const [method, setMethod] = useState('Cash');
  const [txnFee, setTxnFee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const revenue = frplRevenue(actual, item.seller_payout);
  const fees = feesTotal(item.fees);
  const gross = Math.round((revenue + fees) * 100) / 100;
  const net = Math.round((gross - Number(txnFee || 0)) * 100) / 100;
  const belowPayout = actual !== '' && Number(actual) < Number(item.seller_payout);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({
        actualSellingPrice: Number(actual),
        paymentMethod: method,
        transactionFee: txnFee === '' ? null : Number(txnFee),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-sold-title">
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-sold-title">Mark {item.item_number} sold</h2>
        <p className="cs-hint">
          FRPL Retail Price {priceWithTaxLabel(item.selling_price)}. Seller Payout stays {formatDollars(item.seller_payout)}.
        </p>
        <div className="cs-field">
          <label>Sale price before tax ($)</label>
          <input type="number" step="0.01" min="0" value={actual} onChange={(e) => setActual(e.target.value)} required />
        </div>
        <div className="cs-field">
          <label>Payment method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="cs-field">
          <label>Card/transaction fee charged to FRPL ($, optional)</label>
          <input type="number" step="0.01" min="0" value={txnFee} onChange={(e) => setTxnFee(e.target.value)} placeholder="Leave blank if none" />
        </div>
        <div className="cs-sellbox">
          <span>FRPL Sale Margin</span>
          <strong>{formatDollars(revenue)}</strong>
          <p className="cs-hint">
            + fees paid {formatDollars(fees)} = gross {formatDollars(gross)}
            {txnFee !== '' ? ` · net ${formatDollars(net)}` : ''}
          </p>
        </div>
        {belowPayout ? (
          <p className="cs-error">
            The sale price is below the {formatDollars(item.seller_payout)} Seller Payout. Lower the payout first
            (Edit → Change payout) after the seller agrees.
          </p>
        ) : null}
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy || belowPayout}>{busy ? 'Saving…' : 'Mark sold'}</button>
          <button className="cs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
