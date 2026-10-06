import React from 'react';
import { auctionSplit } from '../../utils/consignmentAuctionMath.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

function Req() {
  return <span className="cs-req" aria-label="required">*</span>;
}

export const SALE_METHODS = [
  { id: 'fixed', label: 'Consignment', blurb: 'FRPL prices it and sells it in the case at Legends.' },
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

export function SellTerms({ method, fee, days, auctionFee, commission }) {
  if (method === 'auction') {
    return (
      <div className="cs-sellbox cs-terms">
        <strong>Auction listing fee {formatDollars(auctionFee)}. FRPL keeps {commission}% of the final sale price.</strong>
        <p className="cs-hint">
          The listing fee is paid at drop-off.<br /><br />
          Your reserve is the opening bid. It won’t sell for less.<br />
          When the winner pays at Legends, you receive the sale price minus {commission}%.
        </p>
      </div>
    );
  }
  return (
    <div className="cs-sellbox cs-terms">
      <strong>Consignment fees start at {formatDollars(fee)} for {days} days.</strong>
      <p className="cs-hint">
        The consignment fee is paid at drop-off.<br /><br />
        Tell us how much you’d like to receive for your item.<br />
        If FRPL accepts the item and it sells during the consignment period,<br />
        the seller receives the agreed Seller Payout.
      </p>
    </div>
  );
}

export function PriceFields({ method, form, set, commission }) {
  if (method !== 'auction') {
    return (
      <div className="cs-field">
        <label htmlFor="cs-payout">How much would you like to receive if your item sells? ($) <Req /></label>
        <input id="cs-payout" type="number" min="1" step="0.01" required value={form.seller_payout} onChange={set('seller_payout')} />
        <p className="cs-hint">This is your Seller Payout. FRPL sets the shop price.</p>
      </div>
    );
  }
  const reserve = Number(form.seller_payout) || 0;
  const buyNow = Number(form.buy_now_price) || 0;
  const atReserve = reserve ? auctionSplit(reserve, commission) : null;
  const atBuyNow = buyNow ? auctionSplit(buyNow, commission) : null;
  return (
    <div className="cs-row">
      <div className="cs-field">
        <label htmlFor="cs-reserve">Reserve / opening bid ($) <Req /></label>
        <input id="cs-reserve" type="number" min="1" step="0.01" required value={form.seller_payout} onChange={set('seller_payout')} />
        <p className="cs-hint">
          The lowest price you’ll accept. Bidding starts here.
          {atReserve ? ` If it sells at ${formatDollars(reserve)}, you receive ${formatDollars(atReserve.seller)}.` : ''}
        </p>
      </div>
      <div className="cs-field">
        <label htmlFor="cs-buynow">Buy It Now ($)</label>
        <input id="cs-buynow" type="number" min="1" step="0.01" value={form.buy_now_price} onChange={set('buy_now_price')} />
        <p className="cs-hint">
          Optional. Must be higher than the reserve.
          {atBuyNow ? ` If someone buys it now, you receive ${formatDollars(atBuyNow.seller)}.` : ''}
        </p>
      </div>
    </div>
  );
}
