import React, { useMemo, useState } from 'react';
import { DEFAULT_AUCTION_LISTING_FEE, PAYMENT_METHODS } from '../../data/consignmentConstants.js';
import { startAuction } from '../../services/consignmentAuctionAdminService.js';
import { auctionSplit, DEFAULT_COMMISSION_PCT, openingBid } from '../../utils/consignmentAuctionMath.js';
import {
  AUCTION_LENGTH_OPTIONS,
  auctionEndLabel,
  DEFAULT_AUCTION_DAYS,
  defaultAuctionEnd,
  formatDateTime,
  hoursBetween,
  toLocalInputValue,
} from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

export default function ConsignmentAuctionStartModal({ item, settings, isRelist = false, onClose }) {
  const commissionDefault = Number(settings?.auction_commission_pct ?? DEFAULT_COMMISSION_PCT);
  const daysDefault = AUCTION_LENGTH_OPTIONS.includes(Number(settings?.auction_default_days))
    ? Number(settings.auction_default_days)
    : DEFAULT_AUCTION_DAYS;
  const lowerNeedsConsent = !(item.status === 'pending' && !item.intake_at);
  const sellerChoseAuction = item.sale_method === 'auction';
  const agreedAmount = Number(item.seller_payout) || 0;

  const [reserve, setReserve] = useState(item.seller_payout ?? '');
  const [commission, setCommission] = useState(commissionDefault);
  const [buyNow, setBuyNow] = useState(item.requested_buy_now ?? '');
  const [days, setDays] = useState(daysDefault);
  const [snap, setSnap] = useState(true);
  const [endsAt, setEndsAt] = useState(() => toLocalInputValue(defaultAuctionEnd(new Date(), daysDefault)));
  const [fee, setFee] = useState(settings?.auction_listing_fee ?? DEFAULT_AUCTION_LISTING_FEE);
  const [feePaid, setFeePaid] = useState(true);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const opening = useMemo(() => openingBid(reserve), [reserve]);
  const loweringBlocked = lowerNeedsConsent && opening > 0 && opening < agreedAmount;
  const atOpening = auctionSplit(opening, commission);
  const atBuyNow = buyNow !== '' ? auctionSplit(buyNow, commission) : null;
  const lengthHours = endsAt ? hoursBetween(new Date(), endsAt) : 0;

  const resetEnd = (nextDays, nextSnap) => {
    setEndsAt(toLocalInputValue(defaultAuctionEnd(new Date(), nextDays, { snapToWeekday: nextSnap })));
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await startAuction(item, {
        reserve,
        commissionPct: commission,
        buyNowPrice: buyNow,
        endsAt: new Date(endsAt),
        listingFee: fee,
        feeKind: isRelist ? 'relist' : 'auction_listing',
        feePaidNow: feePaid,
        paymentMethod: method,
      });
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-auction-title">
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-auction-title">{isRelist ? 'Relist' : 'Start'} auction · {item.item_number}</h2>
        <p className="cs-hint">
          {item.name}. {sellerChoseAuction ? 'The seller asked for an auction. ' : ''}The auction goes live as soon as you save.
        </p>
        {!sellerChoseAuction ? (
          <p className="cs-due">
            This item came in as a consignment with a Seller Payout of {formatDollars(agreedAmount)}. As an auction, that becomes
            the reserve and the seller receives {100 - Number(commission)}% of the final price. Confirm the reserve with the seller.
          </p>
        ) : null}

        <div className="cs-row">
          <div className="cs-field">
            <label>Reserve / opening bid ($)</label>
            <input type="number" step="0.01" min="1" value={reserve} onChange={(e) => setReserve(e.target.value)} required />
          </div>
          <div className="cs-field">
            <label>FRPL commission (%)</label>
            <input type="number" step="0.5" min="0" max="99" value={commission} onChange={(e) => setCommission(e.target.value)} required />
          </div>
        </div>
        {loweringBlocked ? (
          <p className="cs-error">
            That’s below the agreed {formatDollars(agreedAmount)}. Get the seller’s OK with “Change payout” on the item first.
          </p>
        ) : null}

        <div className="cs-auction-calc">
          <div>Bidding starts at <strong>{opening ? formatDollars(opening) : '—'}</strong></div>
          {opening ? (
            <div className="cs-meta">At the reserve: seller {formatDollars(atOpening.seller)} · FRPL {formatDollars(atOpening.commission)}</div>
          ) : null}
        </div>

        <div className="cs-field">
          <label>Buy It Now ($, optional)</label>
          <input type="number" step="5" min="0" value={buyNow} onChange={(e) => setBuyNow(e.target.value)} placeholder="Leave blank for none" />
          {atBuyNow ? (
            <span className="cs-hint">
              At Buy It Now: seller {formatDollars(atBuyNow.seller)} · FRPL {formatDollars(atBuyNow.commission)}. Disappears once bidding reaches this price.
              {Number(buyNow) <= opening ? ' Must be higher than the reserve.' : ''}
            </span>
          ) : null}
          {item.requested_buy_now != null ? (
            <span className="cs-hint">Seller asked for {formatDollars(item.requested_buy_now)}.</span>
          ) : null}
        </div>

        <div className="cs-row">
          <div className="cs-field">
            <label>Length</label>
            <select value={days} onChange={(e) => { const d = Number(e.target.value); setDays(d); resetEnd(d, snap); }}>
              {AUCTION_LENGTH_OPTIONS.map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
          <div className="cs-field">
            <label>Ends</label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
          </div>
        </div>
        <label className="cs-check">
          <input type="checkbox" checked={snap} onChange={(e) => { setSnap(e.target.checked); resetEnd(days, e.target.checked); }} />
          End on the nearest {auctionEndLabel()}
        </label>
        <p className="cs-hint">
          Ends {formatDateTime(endsAt)} ({Math.round((lengthHours / 24) * 10) / 10} days). Bids in the final minutes extend it.
        </p>

        <div className="cs-row">
          <div className="cs-field">
            <label>{isRelist ? 'Relist' : 'Listing'} fee ($)</label>
            <input type="number" step="0.01" min="0" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div className="cs-field">
            <label>Payment method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={!feePaid}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <label className="cs-check">
          <input type="checkbox" checked={feePaid} onChange={(e) => setFeePaid(e.target.checked)} />
          Fee paid now
        </label>

        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy || !opening || loweringBlocked}>{busy ? 'Starting…' : 'Start auction'}</button>
          <button className="cs-btn-secondary" type="button" onClick={() => onClose(false)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
