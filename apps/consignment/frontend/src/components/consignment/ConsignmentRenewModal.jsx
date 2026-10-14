import React, { useState } from 'react';
import { CONSENT_METHODS, itemLabel, PAYMENT_METHODS } from '../../data/consignmentConstants.js';
import { renewItem } from '../../services/consignmentFeesService.js';
import { formatShortDate, renewedExpiry } from '../../utils/consignmentDates.js';
import {
  DEFAULT_FEE_POLICY,
  listingFee,
  originalListingFee,
  repeatCount,
  repeatListingFee,
  usesShelfCommission,
} from '../../utils/consignmentFeePolicy.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import ConsignmentModal from './ConsignmentModal.jsx';

export default function ConsignmentRenewModal({ item, defaultFee, consignmentDays, policy = DEFAULT_FEE_POLICY, onClose }) {
  const commissionModel = usesShelfCommission(item);
  const agreed = Number(item.seller_payout);
  const [price, setPrice] = useState(agreed);
  const [consent, setConsent] = useState(CONSENT_METHODS[0]);
  const [feeEdited, setFeeEdited] = useState(false);
  const [manualAmount, setManualAmount] = useState(defaultFee);
  const [days, setDays] = useState(consignmentDays);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const newEnd = renewedExpiry(item.expires_at, Number(days) || 0);

  const newPrice = Number(price);
  const lowering = commissionModel && newPrice > 0 && newPrice < agreed;
  const rule = commissionModel
    ? repeatListingFee({
      originalFee: originalListingFee(item.fees, 'fixed') || listingFee(agreed, 'fixed', policy),
      previousPrice: agreed,
      newPrice,
      priorRepeats: repeatCount(item.fees, 'fixed'),
      policy,
    })
    : null;
  const amount = rule && !feeEdited ? rule.amount : manualAmount;

  const save = async (e) => {
    e.preventDefault();
    if (commissionModel && !(newPrice > 0)) {
      setError('Enter a price greater than $0.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const priceChanged = commissionModel && newPrice !== agreed;
      await renewItem(item, {
        amount: Number(amount) || 0,
        days: Number(days),
        paymentMethod: Number(amount) > 0 ? method : null,
        note: rule?.free ? rule.reason : null,
        ...(priceChanged ? {
          newPayout: newPrice,
          consent: lowering ? consent : null,
          payoutNote: `Price changed at renewal (${formatDollars(agreed)} → ${formatDollars(newPrice)})`,
        } : {}),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConsignmentModal titleId="cs-renew-title" onClose={onClose} busy={busy}>
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-renew-title">Renew {itemLabel(item)}</h2>
        <p className="cs-hint">
          Currently ends {formatShortDate(item.expires_at)}. Renewing records the fee
          {item.status === 'expired' ? ' and puts the item back in the shop' : ''}.
        </p>
        {commissionModel ? (
          <>
            <div className="cs-field">
              <label htmlFor="cs-renew-f1">Price for the next {Number(days) || consignmentDays} days ($)</label>
              <input id="cs-renew-f1" type="number" step="0.01" min="1" value={price} onChange={(e) => setPrice(e.target.value)} required />
              <p className="cs-hint">
                Agreed price now {formatDollars(agreed)}. Lowering it {policy.freeRepeatDropPct}% or more makes the first renewal free.
              </p>
            </div>
            {lowering ? (
              <div className="cs-field">
                <label htmlFor="cs-renew-f2">How did the seller agree to the lower price?</label>
                <select id="cs-renew-f2" value={consent} onChange={(e) => setConsent(e.target.value)}>
                  {CONSENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="cs-row">
          <div className="cs-field">
            <label htmlFor="cs-renew-f3">Renewal fee ($)</label>
            <input id="cs-renew-f3"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => { setFeeEdited(true); setManualAmount(e.target.value); }}
              required
            />
            {rule ? <p className="cs-hint">{rule.reason}</p> : null}
          </div>
          <div className="cs-field">
            <label htmlFor="cs-renew-f4">Days</label>
            <input id="cs-renew-f4" type="number" step="1" min="1" value={days} onChange={(e) => setDays(e.target.value)} required />
          </div>
        </div>
        {Number(amount) > 0 ? (
          <div className="cs-field">
            <label htmlFor="cs-renew-f5">Payment method</label>
            <select id="cs-renew-f5" value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        ) : null}
        <p className="cs-hint">New end date: <strong>{formatShortDate(newEnd)}</strong></p>
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Renew'}</button>
          <button className="cs-btn-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
      </form>
    </ConsignmentModal>
  );
}
