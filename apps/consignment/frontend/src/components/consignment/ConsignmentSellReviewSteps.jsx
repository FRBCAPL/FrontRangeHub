import React, { useEffect, useMemo } from 'react';
import { categoryLabel, conditionLabel, MAX_PHOTOS } from '../../data/consignmentConstants.js';
import { listingFee } from '../../utils/consignmentFeePolicy.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { SALE_METHODS } from './ConsignmentSubmitPricing.jsx';

export function StepDetails({ form, set, files, setFiles }) {
  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const addFiles = (e) => {
    setFiles((prev) => [...prev, ...e.target.files].slice(0, MAX_PHOTOS));
    e.target.value = '';
  };

  return (
    <>
      <div className="cs-field">
        <label htmlFor="cs-specs">Specifications</label>
        <textarea id="cs-specs" rows={3} value={form.specs} onChange={set('specs')} placeholder="Weight, length, wrap, tip, joint…" />
      </div>
      <div className="cs-field">
        <label htmlFor="cs-desc">Description</label>
        <textarea id="cs-desc" rows={3} value={form.description} onChange={set('description')} placeholder="Anything a buyer should know — wear, history, extras included." />
      </div>
      <div className="cs-field">
        <label htmlFor="cs-photos">Photos ({files.length}/{MAX_PHOTOS})</label>
        {files.length < MAX_PHOTOS ? (
          <input id="cs-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} />
        ) : null}
        <p className="cs-hint">Optional, but items with clear photos get reviewed faster.</p>
        {previews.length ? (
          <ul className="cs-wiz-photos">
            {previews.map((p, i) => (
              <li key={p.url}>
                <img src={p.url} alt={`Photo ${i + 1}`} />
                <button
                  type="button"
                  aria-label={`Remove photo ${i + 1}`}
                  onClick={() => setFiles((prev) => prev.filter((f) => f !== p.file))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}

function Row({ label, value }) {
  if (value === '' || value == null) return null;
  return (
    <div className="cs-wiz-review-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function StepReview({ form, files, goTo, policy }) {
  const isAuction = form.sale_method === 'auction';
  const method = SALE_METHODS.find((m) => m.id === form.sale_method)?.label;
  return (
    <>
      <dl className="cs-wiz-review">
        <Row label="Selling by" value={<>{method} <EditLink onClick={() => goTo('method')} /></>} />
        <Row label="Contact" value={<>{[form.seller_name, form.seller_phone, form.seller_email].filter(Boolean).join(' · ')} <EditLink onClick={() => goTo('contact')} /></>} />
        <Row label="Item" value={<>{form.name} <EditLink onClick={() => goTo('item')} /></>} />
        <Row label="Brand / model" value={[form.brand, form.model].filter(Boolean).join(' ')} />
        <Row label="Category" value={`${categoryLabel(form.category)} · ${conditionLabel(form.condition)}`} />
        <Row label="Photos" value={<>{files.length ? `${files.length} added` : 'None'} <EditLink onClick={() => goTo('details')} /></>} />
        <Row
          label={isAuction ? 'Reserve' : 'Your price'}
          value={<>{formatDollars(form.seller_payout)} <EditLink onClick={() => goTo('price')} /></>}
        />
        {isAuction && form.buy_now_price !== '' ? <Row label="Buy It Now" value={formatDollars(form.buy_now_price)} /> : null}
        {isAuction ? null : <Row label="In-store inspection" value={form.allow_inspection ? 'Allowed (ID held)' : 'Not allowed'} />}
        <Row
          label="Listing fee"
          value={`${formatDollars(listingFee(form.seller_payout, form.sale_method, policy))} ${isAuction ? 'before it goes live (Cash App, Venmo or at Legends)' : 'at drop-off'}`}
        />
        {isAuction ? <Row label="The item" value="You keep it until it sells, then bring it to Legends within 3 days" /> : null}
      </dl>
      <p className="cs-hint">Look it over, then tap Next to read and accept the {isAuction ? 'auction' : 'consignment'} agreement.</p>
    </>
  );
}

export function StepAgree({ form, set, agreementText }) {
  const isAuction = form.sale_method === 'auction';
  return (
    <>
      <div className="cs-agree">
        <div className="cs-wiz-agree">{agreementText}</div>
        <label>
          <input type="checkbox" checked={form.agreement} onChange={set('agreement')} />
          I agree to the {isAuction ? 'online auction' : 'consignment'} terms above
          <span className="cs-req" aria-label="required">*</span>
        </label>
      </div>
      <p className="cs-hint">
        Nothing is charged online. If FRPL accepts the item, you pay the listing fee {isAuction ? 'before the auction goes live, by Cash App or Venmo from My items or in person at Legends' : 'at drop-off'}.
        It isn’t refunded if the item doesn’t sell.
      </p>
    </>
  );
}

function EditLink({ onClick }) {
  return <button type="button" className="cs-wiz-edit" onClick={onClick}>Edit</button>;
}
