import React, { useState } from 'react';
import {
  CATEGORIES,
  CONDITIONS,
  DEFAULT_CONSIGNMENT_FEE,
  FIELD_LIMITS,
  itemLabel,
  statusLabel,
  STATUSES,
} from '../../data/consignmentConstants.js';
import { DEFAULT_COMMISSION_PCT } from '../../utils/consignmentAuctionMath.js';
import ConsignmentEditAuctionFields from './ConsignmentEditAuctionFields.jsx';
import { updateAuctionTerms } from '../../services/consignmentAuctionAdminService.js';
import { formatDollars, frplRevenue } from '../../utils/consignmentMoney.js';
import {
  DEFAULT_FEE_POLICY,
  originalListingFee,
  saleSplit,
  usesShelfCommission,
} from '../../utils/consignmentFeePolicy.js';
import { formatShortDate } from '../../utils/consignmentDates.js';
import { fromDateInput, numOrNull, toDateInput } from '../../utils/consignmentFormValues.js';
import { deleteConsignmentPhotos, uploadConsignmentPhotos } from '../../services/consignmentPhotos.js';
import ConsignmentPhotoManager from './ConsignmentPhotoManager.jsx';
import ConsignmentFeesPanel from './ConsignmentFeesPanel.jsx';
import ConsignmentHistoryPanel from './ConsignmentHistoryPanel.jsx';
import ConsignmentPayoutModal from './ConsignmentPayoutModal.jsx';
import ConsignmentModal from './ConsignmentModal.jsx';

const LISTED = ['available', 'sold'];
const ACTIVE_AUCTION = ['draft', 'live', 'awaiting_payment'];

export default function ConsignmentAdminEditModal({
  item,
  defaultFee = DEFAULT_CONSIGNMENT_FEE,
  policy = DEFAULT_FEE_POLICY,
  onClose,
  onSave,
}) {
  const isAuction = item.sale_method === 'auction';
  // Older listed items keep the markup math.
  const commissionModel = usesShelfCommission(item);
  const commissionPct = Number(item.commission_pct ?? policy.shelfCommissionPct);
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
    status: item.status,
    photo_urls: item.photo_urls || [],
    ...('allow_inspection' in item ? { allow_inspection: Boolean(item.allow_inspection) } : {}),
  });
  const [expiresOn, setExpiresOn] = useState(toDateInput(item.expires_at));
  const [removedPhotos, setRemovedPhotos] = useState([]);
  const [changingPayout, setChangingPayout] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const payoutLocked = Boolean(item.intake_at) || item.status !== 'pending';
  // Sold / Available need the Sold, Approve or Renew flows (sale split, fee, listing window).
  const statusLocked = !item.is_example && item.status === 'sold';
  const statusOptions = item.is_example
    ? STATUSES
    : STATUSES.filter((s) => s.id === item.status || !['sold', 'available'].includes(s.id));
  const needsRetail = LISTED.includes(form.status) && !isAuction;

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const retail = numOrNull(form.selling_price);
  const creditedFee = originalListingFee(item.fees, 'fixed') || Number(item.consignment_fee) || 0;
  const atRetail = commissionModel && retail != null ? saleSplit(retail, commissionPct, creditedFee) : null;
  const margin = retail != null
    ? (atRetail ? atRetail.frplFromSale : frplRevenue(retail, form.seller_payout))
    : null;
  const belowAgreed = retail != null && retail < Number(form.seller_payout);

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
      setError('Set the shop price before listing this item.');
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
      const patch = {
        ...form,
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
      if (!isAuction && expiresOn !== toDateInput(item.expires_at)) {
        patch.expires_at = fromDateInput(expiresOn);
      }
      await onSave(patch);
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
    <ConsignmentModal titleId="cs-edit-title" onClose={onClose} busy={busy}>
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-edit-title">
          Edit {itemLabel(item)}
          {isAuction ? <span className="cs-badge auction" style={{ marginLeft: 8 }}>Online auction</span> : null}
        </h2>
        <ConsignmentPhotoManager
          photos={form.photo_urls}
          onChange={(photo_urls) => setForm((prev) => ({ ...prev, photo_urls }))}
          onRemove={(url) => setRemovedPhotos((prev) => [...prev, url])}
          onAddFiles={addPhotos}
          disabled={busy}
        />
        <div className="cs-field">
          <label htmlFor="cs-admin-edit-f1">Item name</label>
          <input id="cs-admin-edit-f1" value={form.name} onChange={set('name')} maxLength={FIELD_LIMITS.name} required />
        </div>
        <div className="cs-row">
          <div className="cs-field">
            <label htmlFor="cs-admin-edit-f2">Brand</label>
            <input id="cs-admin-edit-f2" value={form.brand} onChange={set('brand')} maxLength={FIELD_LIMITS.brand} />
          </div>
          <div className="cs-field">
            <label htmlFor="cs-admin-edit-f3">Model number/name</label>
            <input id="cs-admin-edit-f3" value={form.model} onChange={set('model')} maxLength={FIELD_LIMITS.model} />
          </div>
        </div>
        <div className="cs-row">
          <div className="cs-field">
            <label htmlFor="cs-admin-edit-f4">Category</label>
            <select id="cs-admin-edit-f4" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="cs-field">
            <label htmlFor="cs-admin-edit-f5">Condition</label>
            <select id="cs-admin-edit-f5" value={form.condition} onChange={set('condition')}>
              {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="cs-field">
          <label htmlFor={isAuction || statusLocked ? undefined : 'cs-admin-edit-status'}>Status</label>
          {isAuction ? (
            <>
              <p className="cs-static">{statusLabel(item.status)}</p>
              <p className="cs-hint">Auction items change status through the Auctions tab (start, paid, relist, returned).</p>
            </>
          ) : statusLocked ? (
            <>
              <p className="cs-static">{statusLabel(item.status)}</p>
              <p className="cs-hint">Sold items keep their sale record. Use Undo paid / notes if something needs correcting.</p>
            </>
          ) : (
            <>
              <select id="cs-admin-edit-status" value={form.status} onChange={set('status')}>
                {statusOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <p className="cs-hint">To list or sell an item, use Approve, Renew or Sold on the list so the fee and sale are recorded.</p>
            </>
          )}
        </div>
        <div className="cs-field">
          <label htmlFor="cs-admin-edit-f6">Specs</label>
          <textarea id="cs-admin-edit-f6" rows={2} value={form.specs} onChange={set('specs')} maxLength={FIELD_LIMITS.specs} />
        </div>
        <div className="cs-field">
          <label htmlFor="cs-admin-edit-f7">Description</label>
          <textarea id="cs-admin-edit-f7" rows={3} value={form.description} onChange={set('description')} maxLength={FIELD_LIMITS.description} />
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
            <label htmlFor={payoutLocked ? undefined : 'cs-admin-edit-payout'}>
              {commissionModel ? 'Agreed price ($)' : 'Seller Payout ($)'}
            </label>
            {payoutLocked ? (
              <div className="cs-locked">
                <span>{formatDollars(form.seller_payout)}</span>
                <button type="button" className="cs-btn-secondary" onClick={() => setChangingPayout(true)}>
                  {commissionModel ? 'Change agreed price' : 'Change payout'}
                </button>
              </div>
            ) : (
              <input id="cs-admin-edit-payout" type="number" step="0.01" min="0" value={form.seller_payout} onChange={set('seller_payout')} />
            )}
            {commissionModel ? <p className="cs-hint">The seller’s price. It can’t sell for less without their OK.</p> : null}
          </div>
          <div className="cs-field">
            <label htmlFor="cs-admin-edit-f8">{commissionModel ? 'Shop price ($)' : 'FRPL Retail Price ($)'}</label>
            <input id="cs-admin-edit-f8"
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
          <label>{commissionModel ? 'If it sells at the shop price' : 'FRPL Sale Margin at retail'}</label>
          <p className={`cs-margin${margin != null && margin < 0 ? ' neg' : ''}`}>
            {margin == null ? '—' : formatDollars(margin)}
          </p>
          {atRetail ? (
            <p className="cs-hint">
              FRPL {commissionPct}% = {formatDollars(atRetail.commission)}
              {atRetail.credit ? ` − ${formatDollars(atRetail.credit)} listing fee` : ''} = {formatDollars(atRetail.frplFromSale)} from the sale.
              Seller is paid {formatDollars(atRetail.sellerFromSale)}.
            </p>
          ) : null}
        </div>
        {belowAgreed ? (
          <p className="cs-error">
            {commissionModel ? 'Shop price is below the agreed price.' : 'Retail price is below the Seller Payout.'}
          </p>
        ) : null}
        {'allow_inspection' in form ? (
          <label className="cs-check">
            <input
              type="checkbox"
              checked={form.allow_inspection}
              onChange={(e) => setForm((prev) => ({ ...prev, allow_inspection: e.target.checked }))}
            />
            Buyers may inspect it at Legends (ID held)
          </label>
        ) : null}
        </>
        )}
        {isAuction ? null : (
          <div className="cs-row">
            <div className="cs-field">
              <label>Listed on</label>
              <p className="cs-static">{formatShortDate(item.intake_at)}</p>
            </div>
            <div className="cs-field">
              <label htmlFor="cs-admin-edit-f11">Listing ends</label>
              <input id="cs-admin-edit-f11" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
            </div>
          </div>
        )}
        <ConsignmentFeesPanel item={item} defaultFee={defaultFee} />
        <ConsignmentHistoryPanel itemId={item.id} reloadKey={historyKey} />

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
    </ConsignmentModal>
  );
}
