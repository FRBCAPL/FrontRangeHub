import React from 'react';
import { commissionPctFor, listingFee, saleSplit } from '../../utils/consignmentFeePolicy.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

function Req() {
  return <span className="cs-req" aria-label="required">*</span>;
}

export const SALE_METHODS = [
  { id: 'fixed', label: 'Consignment', blurb: 'You set the price with FRPL. It sells from the case at Legends.' },
  { id: 'auction', label: 'Online auction', blurb: 'You set the reserve and an optional Buy It Now. Bidders set the price.' },
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

export function SellTerms({ method }) {
  const agreement = method === 'auction' ? 'auction agreement' : 'consignment agreement';
  return <p className="cs-hint cs-terms">Listing fees apply. Please see the {agreement}.</p>;
}

function FeePreview({ price, method, policy }) {
  const fee = listingFee(price, method, policy);
  if (!fee) return null;
  const pct = commissionPctFor(method, policy);
  const split = saleSplit(price, pct, fee);
  return (
    <p className="cs-hint">
      Listing fee <strong>{formatDollars(fee)}</strong> at drop-off. If it sells for {formatDollars(split.price)},
      FRPL’s {pct}% is {formatDollars(split.commission)}
      {split.credit ? `, minus your ${formatDollars(fee)} fee` : ''}, so you’re paid <strong>{formatDollars(split.sellerFromSale)}</strong>.
    </p>
  );
}

export function PriceFields({ method, form, set, policy }) {
  if (method !== 'auction') {
    return (
      <div className="cs-field">
        <label htmlFor="cs-payout">Your price ($) <Req /></label>
        <input id="cs-payout" type="number" min="1" step="0.01" required value={form.seller_payout} onChange={set('seller_payout')} />
        <p className="cs-hint">The price buyers see in the case (plus sales tax). FRPL may suggest a different price when it reviews your item.</p>
        <FeePreview price={form.seller_payout} method="fixed" policy={policy} />
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
          <input id="cs-reserve" type="number" min="1" step="0.01" required value={form.seller_payout} onChange={set('seller_payout')} />
          <p className="cs-hint">The lowest price you’ll accept. Bidding starts here.</p>
        </div>
        <div className="cs-field">
          <label htmlFor="cs-buynow">Buy It Now ($)</label>
          <input id="cs-buynow" type="number" min="1" step="0.01" value={form.buy_now_price} onChange={set('buy_now_price')} />
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
