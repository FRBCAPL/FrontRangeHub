import React, { useState } from 'react';
import { itemLabel, PAYMENT_METHODS } from '../../data/consignmentConstants.js';
import { shelfSaleSplit, usesShelfCommission } from '../../utils/consignmentFeePolicy.js';
import { feesTotal, formatDollars, priceWithTaxLabel } from '../../utils/consignmentMoney.js';

export default function ConsignmentSoldModal({ item, onClose, onSave }) {
  const [actual, setActual] = useState(item.selling_price);
  const [method, setMethod] = useState('Cash');
  const [txnFee, setTxnFee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const commissionModel = usesShelfCommission(item);
  const split = shelfSaleSplit(item, Number(actual) || 0);
  const fees = feesTotal(item.fees);
  const gross = Math.round((split.frplFromSale + fees) * 100) / 100;
  const net = Math.round((gross - Number(txnFee || 0)) * 100) / 100;
  const belowPayout = actual !== '' && Number(actual) < Number(item.seller_payout);
  const agreedLabel = commissionModel ? 'agreed price' : 'Seller Payout';

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
        <h2 id="cs-sold-title">Mark {itemLabel(item)} sold</h2>
        <p className="cs-hint">
          Shop price {priceWithTaxLabel(item.selling_price)}.{' '}
          {commissionModel
            ? `Agreed price ${formatDollars(item.seller_payout)} · FRPL commission ${Number(item.commission_pct)}%.`
            : `Seller Payout stays ${formatDollars(item.seller_payout)}.`}
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
          <span>Seller is paid</span>
          <strong>{formatDollars(split.sellerFromSale)}</strong>
          <p className="cs-hint">
            {commissionModel
              ? `FRPL keeps ${formatDollars(split.frplFromSale)} from the sale: ${Number(item.commission_pct)}% (${formatDollars(split.commission)})`
                + (split.credit ? ` minus the ${formatDollars(split.credit)} listing fee already paid.` : '.')
              : `FRPL Sale Margin ${formatDollars(split.frplFromSale)}.`}
            <br />
            + fees paid {formatDollars(fees)} = gross {formatDollars(gross)}
            {txnFee !== '' ? ` · net ${formatDollars(net)}` : ''}
          </p>
        </div>
        {belowPayout ? (
          <p className="cs-error">
            The sale price is below the {formatDollars(item.seller_payout)} {agreedLabel}. Lower it first
            (Edit → Change {commissionModel ? 'agreed price' : 'payout'}) after the seller agrees.
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
