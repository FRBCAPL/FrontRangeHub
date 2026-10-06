import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CATEGORIES,
  CONDITIONS,
  CONSIGNMENT_DAYS,
  CONSIGNMENT_PATH,
  DEFAULT_AUCTION_LISTING_FEE,
  DEFAULT_CONSIGNMENT_FEE,
  MAX_PHOTOS,
} from '../../data/consignmentConstants.js';
import { loadSettings, submitItem } from '../../services/consignmentService.js';
import { uploadConsignmentPhotos } from '../../services/consignmentPhotos.js';
import { DEFAULT_COMMISSION_PCT } from '../../utils/consignmentAuctionMath.js';
import { PriceFields, SaleMethodPicker, SellTerms } from './ConsignmentSubmitPricing.jsx';
import {
  auctionAgreementTemplate,
  consignmentAgreementTemplate,
  DEFAULT_AUCTION_AGREEMENT,
  DEFAULT_CONSIGNMENT_AGREEMENT,
  fillAuctionAgreement,
  fillConsignmentAgreement,
} from '../../data/consignmentAgreements.js';

const empty = {
  seller_name: '',
  seller_phone: '',
  seller_email: '',
  name: '',
  brand: '',
  model: '',
  category: 'cues',
  condition: 'good',
  description: '',
  specs: '',
  sale_method: 'fixed',
  seller_payout: '',
  buy_now_price: '',
  agreement: false,
};

function Req() {
  return <span className="cs-req" aria-label="required">*</span>;
}

export default function ConsignmentSubmit() {
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState([]);
  const [fee, setFee] = useState(DEFAULT_CONSIGNMENT_FEE);
  const [days, setDays] = useState(CONSIGNMENT_DAYS);
  const [auctionFee, setAuctionFee] = useState(DEFAULT_AUCTION_LISTING_FEE);
  const [commission, setCommission] = useState(DEFAULT_COMMISSION_PCT);
  const [agreementText, setAgreementText] = useState(() => fillConsignmentAgreement(DEFAULT_CONSIGNMENT_AGREEMENT, null));
  const [auctionAgreement, setAuctionAgreement] = useState(() => fillAuctionAgreement(DEFAULT_AUCTION_AGREEMENT, null));
  const isAuction = form.sale_method === 'auction';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    loadSettings()
      .then((row) => {
        if (!row) return;
        if (row.default_consignment_fee != null) setFee(Number(row.default_consignment_fee));
        if (row.consignment_days) setDays(Number(row.consignment_days));
        if (row.auction_listing_fee != null) setAuctionFee(Number(row.auction_listing_fee));
        if (row.auction_commission_pct != null) setCommission(Number(row.auction_commission_pct));
        setAgreementText(fillConsignmentAgreement(consignmentAgreementTemplate(row), row));
        setAuctionAgreement(fillAuctionAgreement(auctionAgreementTemplate(row), row));
      })
      .catch((err) => setError(err.message));
  }, []);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isAuction && form.buy_now_price !== '' && Number(form.buy_now_price) <= Number(form.seller_payout)) {
      setError('Buy It Now must be higher than the reserve.');
      return;
    }
    setBusy(true);
    try {
      const photo_urls = await uploadConsignmentPhotos(files);
      const data = await submitItem({
        seller_name: form.seller_name,
        seller_phone: form.seller_phone,
        seller_email: form.seller_email,
        name: form.name,
        brand: form.brand,
        model: form.model,
        category: form.category,
        condition: form.condition,
        description: form.description,
        specs: form.specs,
        seller_payout: Number(form.seller_payout),
        sale_method: form.sale_method,
        buy_now_price: isAuction && form.buy_now_price !== '' ? Number(form.buy_now_price) : null,
        photo_urls,
        agreement_accepted: form.agreement,
      });
      setDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="cs-page cs-page-centered">
        <h1>Submitted</h1>
        <p className="cs-lede">
          Thanks. Your request is in as <strong>{done.item_number}</strong>.
          FRPL will review it and contact you. If we accept the item, you'll bring it to Legends
          and pay the {done.sale_method === 'auction' ? 'auction listing fee' : 'consignment fee'} then — nothing is charged online.
        </p>
        <Link className="cs-btn" to={CONSIGNMENT_PATH}>Back to shop</Link>
      </div>
    );
  }

  return (
    <div className="cs-page cs-page-centered">
      <p className="cs-kicker">Sell through FRPL</p>
      <h1>Submit an item</h1>
      <p className="cs-lede">
        <strong>You tell us what you want to get. We help sell it.</strong>
      </p>
      <SaleMethodPicker value={form.sale_method} onChange={(m) => setForm((prev) => (prev.sale_method === m ? prev : { ...prev, sale_method: m, agreement: false }))} />
      <SellTerms method={form.sale_method} fee={fee} days={days} auctionFee={auctionFee} commission={commission} />
      <form className="cs-form" onSubmit={onSubmit}>
        <div className="cs-row">
          <div className="cs-field">
            <label htmlFor="cs-seller">Your name <Req /></label>
            <input id="cs-seller" required value={form.seller_name} onChange={set('seller_name')} />
          </div>
          <div className="cs-field">
            <label htmlFor="cs-phone">Phone <Req /></label>
            <input id="cs-phone" value={form.seller_phone} onChange={set('seller_phone')} />
          </div>
        </div>
        <div className="cs-field">
          <label htmlFor="cs-email">Email <Req /></label>
          <input id="cs-email" type="email" value={form.seller_email} onChange={set('seller_email')} />
          <p className="cs-hint">Phone or email — at least one is required.</p>
        </div>
        <div className="cs-field">
          <label htmlFor="cs-name">Item name <Req /></label>
          <input id="cs-name" required value={form.name} onChange={set('name')} />
        </div>
        <div className="cs-row">
          <div className="cs-field">
            <label htmlFor="cs-brand">Brand</label>
            <input id="cs-brand" value={form.brand} onChange={set('brand')} />
          </div>
          <div className="cs-field">
            <label htmlFor="cs-model">Model number/name</label>
            <input id="cs-model" value={form.model} onChange={set('model')} />
          </div>
        </div>
        <div className="cs-row">
          <div className="cs-field">
            <label htmlFor="cs-cat">Category</label>
            <select id="cs-cat" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="cs-field">
            <label htmlFor="cs-cond">Condition</label>
            <select id="cs-cond" value={form.condition} onChange={set('condition')}>
              {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="cs-field">
          <label htmlFor="cs-specs">Specifications</label>
          <textarea id="cs-specs" rows={3} value={form.specs} onChange={set('specs')} placeholder="Weight, length, wrap, tip, joint…" />
        </div>
        <div className="cs-field">
          <label htmlFor="cs-desc">Description</label>
          <textarea id="cs-desc" rows={4} value={form.description} onChange={set('description')} />
        </div>
        <div className="cs-field">
          <label htmlFor="cs-photos">Photos (up to {MAX_PHOTOS})</label>
          <input
            id="cs-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => setFiles([...e.target.files].slice(0, MAX_PHOTOS))}
          />
        </div>
        <PriceFields method={form.sale_method} form={form} set={set} commission={commission} />
        <div className="cs-agree">
          {isAuction ? auctionAgreement : agreementText}
          <label>
            <input type="checkbox" checked={form.agreement} onChange={set('agreement')} required />
            I agree to the {isAuction ? 'online auction' : 'consignment'} terms above <Req />
          </label>
        </div>
        {error ? <p className="cs-error">{error}</p> : null}
        <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
      </form>
    </div>
  );
}
