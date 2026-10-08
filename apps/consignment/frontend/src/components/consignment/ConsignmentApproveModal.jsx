import React, { useState } from 'react';
import {
  brandModelLabel,
  categoryLabel,
  conditionLabel,
  CONSIGNMENT_DAYS,
  itemLabel,
  PAYMENT_METHODS,
} from '../../data/consignmentConstants.js';
import { intakePatch, recordFee } from '../../services/consignmentFeesService.js';
import { DEFAULT_FEE_POLICY, listingFee, saleSplit } from '../../utils/consignmentFeePolicy.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import './consignment-approve.css';

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ItemSummary({ item }) {
  const brandModel = brandModelLabel(item);
  return (
    <div className="cs-approve-item">
      <div className="cs-approve-thumb">
        {item.photo_urls?.[0] ? <img src={item.photo_urls[0]} alt="" /> : <span>🎱</span>}
      </div>
      <div>
        <strong>{item.name}</strong>
        {brandModel ? <div className="cs-meta">{brandModel}</div> : null}
        <div className="cs-meta">
          {categoryLabel(item.category)} · {conditionLabel(item.condition)} · {item.photo_urls?.length || 0} photo
          {item.photo_urls?.length === 1 ? '' : 's'}
        </div>
        {item.seller ? (
          <div className="cs-meta">
            Seller: {item.seller.full_name}
            {item.seller.phone || item.seller.email ? ` · ${item.seller.phone || item.seller.email}` : ''}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Quick accept-and-list for a pending item. Full details stay in the editor ("Edit details"). */
export default function ConsignmentApproveModal({
  item,
  consignmentDays = CONSIGNMENT_DAYS,
  policy = DEFAULT_FEE_POLICY,
  onEditDetails,
  onClose,
  onSave,
}) {
  const commissionPct = Number(item.commission_pct ?? policy.shelfCommissionPct);
  const [agreed, setAgreed] = useState(item.seller_payout ?? '');
  const [shop, setShop] = useState(item.selling_price ?? item.seller_payout ?? '');
  const [manualFee, setManualFee] = useState(null);
  const [feePaid, setFeePaid] = useState(true);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const agreedNum = numOrNull(agreed);
  const shopNum = numOrNull(shop);
  const fee = manualFee ?? listingFee(shopNum ?? agreedNum, 'fixed', policy);
  const feeNum = Number(fee) || 0;
  const split = shopNum ? saleSplit(shopNum, commissionPct, feeNum) : null;
  const belowAgreed = shopNum != null && agreedNum != null && shopNum < agreedNum;

  const save = async (e) => {
    e.preventDefault();
    if (!(agreedNum > 0) || !(shopNum > 0)) { setError('Enter the agreed price and the shop price.'); return; }
    if (belowAgreed) { setError('The shop price can’t be below the agreed price.'); return; }
    if (feeNum > 0 && !feePaid) { setError('Collect the listing fee before the item goes in the case.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSave({
        seller_payout: agreedNum,
        selling_price: shopNum,
        consignment_fee: feeNum,
        commission_pct: commissionPct,
        sale_method: 'fixed',
        status: 'available',
        ...intakePatch(consignmentDays),
      });
      if (feeNum > 0) {
        await recordFee(item.id, { kind: 'consignment', amount: feeNum, days: consignmentDays, paymentMethod: method });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-approve-title">
      <form className="cs-modal-card cs-form cs-approve" onSubmit={save}>
        <h2 id="cs-approve-title">Approve {itemLabel(item)}</h2>
        <ItemSummary item={item} />
        <button type="button" className="cs-link-btn" onClick={onEditDetails}>Edit details or photos</button>
        {item.sale_method === 'auction' ? (
          <p className="cs-due">The seller asked for an online auction. Approving here puts it in the case instead.</p>
        ) : null}

        <div className="cs-row">
          <div className="cs-field">
            <label htmlFor="cs-approve-agreed">Agreed price ($)</label>
            <input id="cs-approve-agreed" type="number" min="1" step="0.01" value={agreed} onChange={(e) => setAgreed(e.target.value)} required />
          </div>
          <div className="cs-field">
            <label htmlFor="cs-approve-shop">Shop price ($)</label>
            <input id="cs-approve-shop" type="number" min="1" step="0.01" value={shop} onChange={(e) => setShop(e.target.value)} required />
          </div>
        </div>
        {split ? (
          <p className="cs-hint">
            At {formatDollars(split.price)}: seller is paid <strong>{formatDollars(split.sellerFromSale)}</strong>, FRPL keeps{' '}
            {formatDollars(split.frplFromSale)} ({commissionPct}%{split.credit ? ` minus the ${formatDollars(split.credit)} fee` : ''}).
          </p>
        ) : null}
        {belowAgreed ? <p className="cs-error">The shop price is below the agreed price.</p> : null}

        <div className="cs-row">
          <div className="cs-field">
            <label htmlFor="cs-approve-fee">Listing fee ($)</label>
            <input id="cs-approve-fee" type="number" min="0" step="0.01" value={fee} onChange={(e) => setManualFee(e.target.value)} />
          </div>
          {feeNum > 0 ? (
            <div className="cs-field">
              <label htmlFor="cs-approve-method">Paid with</label>
              <select id="cs-approve-method" value={method} onChange={(e) => setMethod(e.target.value)} disabled={!feePaid}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          ) : null}
        </div>
        {feeNum > 0 ? (
          <label className="cs-check">
            <input type="checkbox" checked={feePaid} onChange={(e) => setFeePaid(e.target.checked)} />
            Fee paid
          </label>
        ) : null}
        <p className="cs-hint">Goes live in the shop when you approve. The {consignmentDays}-day window starts today.</p>

        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Approving…' : 'Approve & list'}</button>
          <button className="cs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
