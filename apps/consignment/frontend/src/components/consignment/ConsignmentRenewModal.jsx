import React, { useState } from 'react';
import { CONSENT_METHODS, itemLabel, PAYMENT_METHODS } from '../../data/consignmentConstants.js';
import { renewItem } from '../../services/consignmentFeesService.js';
import { changePayout } from '../../services/consignmentPayoutService.js';
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

const round2 = (n) => Math.round(Number(n) * 100) / 100;

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
      let itemPatch = null;
      if (commissionModel && newPrice !== agreed) {
        await changePayout(item.id, {
          newPayout: newPrice,
          consent: lowering ? consent : null,
          note: `Price changed at renewal (${formatDollars(agreed)} → ${formatDollars(newPrice)})`,
        });
        // The shop price moves by the same % so any spread above the agreed price is kept.
        const shop = Number(item.selling_price) || agreed;
        itemPatch = { selling_price: round2(shop * (newPrice / agreed)) };
      }
      await renewItem(item, {
        amount: Number(amount) || 0,
        days: Number(days),
        paymentMethod: Number(amount) > 0 ? method : null,
        note: rule?.free ? rule.reason : null,
        itemPatch,
      });
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
        <h2 id="cs-renew-title">Renew {itemLabel(item)}</h2>
        <p className="cs-hint">
          Currently ends {formatShortDate(item.expires_at)}. Renewing records the fee
          {item.status === 'expired' ? ' and puts the item back in the shop' : ''}.
        </p>
        {commissionModel ? (
          <>
            <div className="cs-field">
              <label>Price for the next {Number(days) || consignmentDays} days ($)</label>
              <input type="number" step="0.01" min="1" value={price} onChange={(e) => setPrice(e.target.value)} required />
              <p className="cs-hint">
                Agreed price now {formatDollars(agreed)}. Lowering it {policy.freeRepeatDropPct}% or more makes the first renewal free.
              </p>
            </div>
            {lowering ? (
              <div className="cs-field">
                <label>How did the seller agree to the lower price?</label>
                <select value={consent} onChange={(e) => setConsent(e.target.value)}>
                  {CONSENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="cs-row">
          <div className="cs-field">
            <label>Renewal fee ($)</label>
            <input
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
            <label>Days</label>
            <input type="number" step="1" min="1" value={days} onChange={(e) => setDays(e.target.value)} required />
          </div>
        </div>
        {Number(amount) > 0 ? (
          <div className="cs-field">
            <label>Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        ) : null}
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
