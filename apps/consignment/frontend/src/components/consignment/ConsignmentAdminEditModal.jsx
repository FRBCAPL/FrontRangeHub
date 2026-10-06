import React, { useState } from 'react';
import {
  CATEGORIES,
  CONDITIONS,
  CONSIGNMENT_DAYS,
  DEFAULT_CONSIGNMENT_FEE,
  PAYMENT_METHODS,
  statusLabel,
  STATUSES,
} from '../../data/consignmentConstants.js';
import { DEFAULT_COMMISSION_PCT } from '../../utils/consignmentAuctionMath.js';
import ConsignmentEditAuctionFields from './ConsignmentEditAuctionFields.jsx';
import { updateAuctionTerms } from '../../services/consignmentAuctionAdminService.js';
import { formatDollars, frplRevenue } from '../../utils/consignmentMoney.js';
import { formatShortDate } from '../../utils/consignmentDates.js';
import { deleteConsignmentPhotos, uploadConsignmentPhotos } from '../../services/consignmentPhotos.js';
import { intakePatch, recordFee } from '../../services/consignmentFeesService.js';
import ConsignmentPhotoManager from './ConsignmentPhotoManager.jsx';
import ConsignmentFeesPanel from './ConsignmentFeesPanel.jsx';
import ConsignmentHistoryPanel from './ConsignmentHistoryPanel.jsx';
import ConsignmentPayoutModal from './ConsignmentPayoutModal.jsx';

const LISTED = ['available', 'sold'];
const ACTIVE_AUCTION = ['draft', 'live', 'awaiting_payment'];

function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** End of the chosen local day, so an item listed "until Oct 30" stays up all of Oct 30. */
function fromDateInput(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).toISOString();
}

export default function ConsignmentAdminEditModal({
  item,
  approving = false,
  defaultFee = DEFAULT_CONSIGNMENT_FEE,
  consignmentDays = CONSIGNMENT_DAYS,
  onClose,
  onSave,
}) {
  const isAuction = item.sale_method === 'auction' && !approving;
  const activeAuction = isAuction && ACTIVE_AUCTION.includes(item.auction?.status) ? item.auction : null;
  const termsEditable = isAuction
    && ['pending', 'available'].includes(item.status)
    && !(activeAuction && (activeAuction.status === 'awaiting_payment' || activeAuction.bid_count > 0));
  const startReserve = activeAuction ? activeAuction.opening_bid : item.seller_payout;
  const startBuyNow = (activeAuction ? activeAuction.buy_now_price : item.requested_buy_now) ?? '';
  const [form, setForm] = useState({
    name: item.name || '',
    brand: item.brand || '',
    model: item.model || '',
    category: item.category,
    condition: item.condition,
    description: item.description || '',
    specs: item.specs || '',
    seller_payout: isAuction ? startReserve : item.seller_payout,
    requested_buy_now: startBuyNow,
    selling_price: item.selling_price ?? '',
    consignment_fee: item.consignment_fee ?? defaultFee,
    status: approving ? 'available' : item.status,
    photo_urls: item.photo_urls || [],
  });
  const [expiresOn, setExpiresOn] = useState(toDateInput(item.expires_at));
  const [feePaid, setFeePaid] = useState(true);
  const [feeMethod, setFeeMethod] = useState(PAYMENT_METHODS[0]);
  const [removedPhotos, setRemovedPhotos] = useState([]);
  const [changingPayout, setChangingPayout] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const payoutLocked = Boolean(item.intake_at) || (!approving && item.status !== 'pending');
  const needsRetail = LISTED.includes(form.status) && !isAuction;

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const retail = numOrNull(form.selling_price);
  const margin = retail != null ? frplRevenue(retail, form.seller_payout) : null;

  const addPhotos = async (files) => {
    if (!files.length) return;
    setBusy(true);
    try {
      const urls = await uploadConsignmentPhotos(files);
      setForm((prev) => ({ ...prev, photo_urls: [...prev.photo_urls, ...urls] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (needsRetail && retail == null) {
      setError('Set the FRPL Retail Price before listing this item.');
      return;
    }
    const reserve = Number(form.seller_payout);
    const buyNow = numOrNull(form.requested_buy_now);
    if (termsEditable && !(reserve > 0)) {
      setError('Enter a reserve greater than $0.');
      return;
    }
    if (termsEditable && buyNow != null && buyNow <= reserve) {
      setError('Buy It Now must be higher than the reserve.');
      return;
    }
    const termsChanged = termsEditable
      && (reserve !== Number(startReserve) || buyNow !== numOrNull(startBuyNow));
    setBusy(true);
    setError('');
    try {
      const { consignment_fee: feeInput, ...rest } = form;
      const fee = numOrNull(feeInput);
      const patch = {
        ...rest,
        seller_payout: Number(form.seller_payout),
        selling_price: retail,
      };
      delete patch.requested_buy_now;
      if (payoutLocked || isAuction) delete patch.seller_payout;
      if (isAuction) {
        delete patch.status;
        delete patch.selling_price;
      }
      if (termsChanged) await updateAuctionTerms(item.id, { reserve, buyNow });
      if (approving) {
        Object.assign(patch, { consignment_fee: fee, sale_method: 'fixed' }, intakePatch(consignmentDays));
      } else if (!isAuction && expiresOn !== toDateInput(item.expires_at)) {
        patch.expires_at = fromDateInput(expiresOn);
      }
      await onSave(patch);
      if (approving && feePaid && fee) {
        await recordFee(item.id, { kind: 'consignment', amount: fee, days: consignmentDays, paymentMethod: feeMethod });
      }
      const gone = removedPhotos.filter((url) => !form.photo_urls.includes(url));
      await deleteConsignmentPhotos(gone).catch(() => {});
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-edit-title">
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-edit-title">
          {approving ? 'Approve' : 'Edit'} {item.item_number}
          {isAuction ? <span className="cs-badge auction" style={{ marginLeft: 8 }}>Online auction</span> : null}
        </h2>
        {approving ? (
          <p className="cs-hint">
            Set the FRPL Retail Price and consignment fee. The item goes live in the shop when you save,
            and its {consignmentDays}-day window starts today.
          </p>
        ) : null}
        <ConsignmentPhotoManager
          photos={form.photo_urls}
          onChange={(photo_urls) => setForm((prev) => ({ ...prev, photo_urls }))}
          onRemove={(url) => setRemovedPhotos((prev) => [...prev, url])}
          onAddFiles={addPhotos}
          disabled={busy}
        />
        <div className="cs-field">
          <label>Item name</label>
          <input value={form.name} onChange={set('name')} required />
        </div>
        <div className="cs-row">
          <div className="cs-field">
            <label>Brand</label>
            <input value={form.brand} onChange={set('brand')} />
          </div>
          <div className="cs-field">
            <label>Model number/name</label>
            <input value={form.model} onChange={set('model')} />
          </div>
        </div>
        <div className="cs-row">
          <div className="cs-field">
            <label>Category</label>
            <select value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="cs-field">
            <label>Condition</label>
            <select value={form.condition} onChange={set('condition')}>
              {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="cs-field">
          <label>Status</label>
          {isAuction ? (
            <>
              <p className="cs-static">{statusLabel(item.status)}</p>
              <p className="cs-hint">Auction items change status through the Auctions tab (start, paid, relist, returned).</p>
            </>
          ) : (
            <select value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          )}
        </div>
        <div className="cs-field">
          <label>Specs</label>
          <textarea rows={2} value={form.specs} onChange={set('specs')} />
        </div>
        <div className="cs-field">
          <label>Description</label>
          <textarea rows={3} value={form.description} onChange={set('description')} />
        </div>
        {isAuction ? (
          <ConsignmentEditAuctionFields
            item={item}
            form={form}
            set={set}
            editable={termsEditable}
            commission={Number(item.auction?.commission_pct ?? DEFAULT_COMMISSION_PCT)}
          />
        ) : (
        <>
        <div className="cs-row">
          <div className="cs-field">
            <label>Seller Payout ($)</label>
            {payoutLocked ? (
              <div className="cs-locked">
                <span>{formatDollars(form.seller_payout)}</span>
                <button type="button" className="cs-btn-secondary" onClick={() => setChangingPayout(true)}>Change payout</button>
              </div>
            ) : (
              <input type="number" step="0.01" min="0" value={form.seller_payout} onChange={set('seller_payout')} />
            )}
          </div>
          <div className="cs-field">
            <label>FRPL Retail Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.selling_price}
              onChange={set('selling_price')}
              required={needsRetail}
            />
          </div>
        </div>
        <div className="cs-field">
          <label>FRPL Sale Margin at retail</label>
          <p className={`cs-margin${margin != null && margin < 0 ? ' neg' : ''}`}>
            {margin == null ? '—' : formatDollars(margin)}
          </p>
        </div>
        {margin != null && margin < 0 ? (
          <p className="cs-error">Retail price is below the Seller Payout.</p>
        ) : null}
        </>
        )}
        {approving ? (
          <div className="cs-row">
            <div className="cs-field">
              <label>Consignment fee ($)</label>
              <input type="number" step="0.01" min="0" value={form.consignment_fee} onChange={set('consignment_fee')} />
              <label className="cs-check">
                <input type="checkbox" checked={feePaid} onChange={(e) => setFeePaid(e.target.checked)} />
                Fee paid now
              </label>
            </div>
            <div className="cs-field">
              <label>Payment method</label>
              <select value={feeMethod} onChange={(e) => setFeeMethod(e.target.value)} disabled={!feePaid}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <>
            {isAuction ? null : (
              <div className="cs-row">
                <div className="cs-field">
                  <label>Listed on</label>
                  <p className="cs-static">{formatShortDate(item.intake_at)}</p>
                </div>
                <div className="cs-field">
                  <label>Listing ends</label>
                  <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
                </div>
              </div>
            )}
            <ConsignmentFeesPanel item={item} defaultFee={defaultFee} />
            <ConsignmentHistoryPanel itemId={item.id} reloadKey={historyKey} />
          </>
        )}
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <button className="cs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
      {changingPayout ? (
        <ConsignmentPayoutModal
          item={item}
          currentPayout={form.seller_payout}
          onClose={() => setChangingPayout(false)}
          onChanged={(seller_payout) => {
            setForm((prev) => ({ ...prev, seller_payout }));
            setHistoryKey((k) => k + 1);
          }}
        />
      ) : null}
    </div>
  );
}
