import React, { useEffect, useState } from 'react';
import { commissionPctFor, listingFee, saleSplit } from '../../utils/consignmentFeePolicy.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { sellPretaxPrice } from '../../utils/consignmentSellSteps.js';
import { taxPercent, withTax } from '../../utils/consignmentTax.js';
import useTaxRate from '../../hooks/useTaxRate.js';
import ConsignmentAgreementModal from './ConsignmentAgreementModal.jsx';

function Req() {
  return <span className="cs-req" aria-label="required">*</span>;
}

export const SALE_METHODS = [
  { id: 'fixed', label: 'In the case: consignment', blurb: 'You set the price with FRPL. It sells from the case at Legends.' },
  { id: 'auction', label: 'On the table: online auction', blurb: 'You set the reserve and an optional Buy It Now. Bidders set the price.' },
];

export function SaleMethodPicker({ value, onChange }) {
  return (
    <div className="cs-method" role="radiogroup" aria-label="How do you want to sell?">
      {SALE_METHODS.map((m) => (
        <label key={m.id} className={`cs-method-option${value === m.id ? ' active' : ''}`}>
          <input type="radio" name="cs-sale-method" value={m.id} checked={value === m.id} onChange={() => onChange(m.id)} />
          <strong>{m.label}</strong>
          <span>{m.blurb}</span>
        </label>
      ))}
    </div>
  );
}

export function SellTerms({ method, agreementText }) {
  const [open, setOpen] = useState(false);
  const agreement = method === 'auction' ? 'auction agreement' : 'consignment agreement';
  useEffect(() => setOpen(false), [method]);
  if (!agreementText) return <p className="cs-hint cs-terms">Listing fees apply. Please see the {agreement}.</p>;
  return (
    <div className="cs-terms">
      <p className="cs-hint">
        Listing fees apply. Please see the{' '}
        <button type="button" className="cs-link-btn cs-terms-link" onClick={() => setOpen(true)} aria-haspopup="dialog">
          {agreement}
        </button>.
      </p>
      {open ? <ConsignmentAgreementModal method={method} text={agreementText} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function FeePreview({ price, method, policy }) {
  const fee = listingFee(price, method, policy);
  if (!fee) return null;
  const pct = commissionPctFor(method, policy);
  const split = saleSplit(price, pct, fee);
  return (
    <p className="cs-hint">
      Listing fee <strong>{formatDollars(fee)}</strong> {method === 'auction' ? 'before the auction goes live' : 'at drop-off'}. If it sells for {formatDollars(split.price)},
      FRPL’s {pct}% is {formatDollars(split.commission)}
      {split.credit ? `, minus your ${formatDollars(fee)} fee` : ''}, so you’re paid <strong>{formatDollars(split.sellerFromSale)}</strong>.
    </p>
  );
}

function TaxIncludedHint({ form, rate }) {
  const typed = Number(form.seller_payout) || 0;
  if (!form.price_tax_included) {
    return (
      <p className="cs-hint">
        The price before tax. Buyers see it with {taxPercent(rate)} sales tax added
        {typed > 0 ? ` (${formatDollars(withTax(typed, rate))})` : ''}. FRPL may suggest a different price when it reviews your item.
      </p>
    );
  }
  const pretax = sellPretaxPrice(form, rate);
  return (
    <p className="cs-hint">
      Buyers see {typed > 0 ? <strong>{formatDollars(withTax(pretax, rate))} tax included</strong> : 'your price, tax included'}.
      {typed > 0 ? ` The sale price before tax is ${formatDollars(pretax)}; fees and your payout are figured on that.` : ''}{' '}
      FRPL may suggest a different price when it reviews your item.
    </p>
  );
}

export function PriceFields({ method, form, set, policy }) {
  const rate = useTaxRate();
  if (method !== 'auction') {
    return (
      <div className="cs-field">
        <label htmlFor="cs-payout">{form.price_tax_included ? 'Your price, tax included ($)' : 'Your price ($)'} <Req /></label>
        <input id="cs-payout" type="number" inputMode="decimal" min="1" step="0.01" required value={form.seller_payout} onChange={set('seller_payout')} />
        <label className="cs-check">
          <input type="checkbox" checked={Boolean(form.price_tax_included)} onChange={set('price_tax_included')} />
          <span>My price includes sales tax (buyers pay exactly this)</span>
        </label>
        <TaxIncludedHint form={form} rate={rate} />
        <FeePreview price={sellPretaxPrice(form, rate)} method="fixed" policy={policy} />
        <label className="cs-check">
          <input type="checkbox" checked={Boolean(form.allow_inspection)} onChange={set('allow_inspection')} />
          <span>
            Let buyers inspect it at Legends. Staff hold the buyer’s ID while they look it over. If unchecked, it stays
            in the case until it’s bought.
          </span>
        </label>
      </div>
    );
  }
  const auctionFee = listingFee(form.seller_payout, 'auction', policy);
  const pct = commissionPctFor('auction', policy);
  const buyNow = Number(form.buy_now_price) || 0;
  const atBuyNow = buyNow && auctionFee ? saleSplit(buyNow, pct, auctionFee) : null;
  return (
    <>
      <div className="cs-row">
        <div className="cs-field">
          <label htmlFor="cs-reserve">Reserve / opening bid ($) <Req /></label>
          <input id="cs-reserve" type="number" inputMode="decimal" min="1" step="0.01" required value={form.seller_payout} onChange={set('seller_payout')} />
          <p className="cs-hint">The lowest price you’ll accept. Bidding starts here.</p>
        </div>
        <div className="cs-field">
          <label htmlFor="cs-buynow">Buy It Now ($)</label>
          <input id="cs-buynow" type="number" inputMode="decimal" min="1" step="0.01" value={form.buy_now_price} onChange={set('buy_now_price')} />
          <p className="cs-hint">
            Optional. Must be higher than the reserve.
            {atBuyNow ? ` If someone buys it now, you’re paid ${formatDollars(atBuyNow.sellerFromSale)}.` : ''}
          </p>
        </div>
      </div>
      <FeePreview price={form.seller_payout} method="auction" policy={policy} />
    </>
  );
}
