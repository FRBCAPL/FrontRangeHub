import React from 'react';
import { CATEGORIES, CONDITIONS } from '../../data/consignmentConstants.js';
import { PriceFields, SaleMethodPicker, SellTerms } from './ConsignmentSubmitPricing.jsx';

function Req() {
  return <span className="cs-req" aria-label="required">*</span>;
}

export function StepMethod({ form, setMethod, terms }) {
  return (
    <>
      <SaleMethodPicker value={form.sale_method} onChange={setMethod} />
      <SellTerms method={form.sale_method} {...terms} />
    </>
  );
}

export function StepContact({ form, set }) {
  return (
    <>
      <div className="cs-field">
        <label htmlFor="cs-seller">Your name <Req /></label>
        <input id="cs-seller" autoComplete="name" value={form.seller_name} onChange={set('seller_name')} autoFocus />
      </div>
      <div className="cs-row">
        <div className="cs-field">
          <label htmlFor="cs-phone">Phone</label>
          <input id="cs-phone" type="tel" autoComplete="tel" value={form.seller_phone} onChange={set('seller_phone')} />
        </div>
        <div className="cs-field">
          <label htmlFor="cs-email">Email</label>
          <input id="cs-email" type="email" autoComplete="email" value={form.seller_email} onChange={set('seller_email')} />
        </div>
      </div>
      <p className="cs-hint">
        Phone or email — at least one is required. Use your FRPL account email to track this item under My items.
      </p>
    </>
  );
}

export function StepItem({ form, set }) {
  return (
    <>
      <div className="cs-field">
        <label htmlFor="cs-name">Item name <Req /></label>
        <input id="cs-name" value={form.name} onChange={set('name')} placeholder="e.g. Predator Throne cue" autoFocus />
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
    </>
  );
}

export function StepPrice({ form, set, commission }) {
  return <PriceFields method={form.sale_method} form={form} set={set} commission={commission} />;
}
