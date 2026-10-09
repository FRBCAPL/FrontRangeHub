import React, { useEffect, useMemo, useState } from 'react';
import { CONSENT_METHODS, itemLabel, PAYMENT_METHODS } from '../../data/consignmentConstants.js';
import { startAuction } from '../../services/consignmentAuctionAdminService.js';
import { loadFeesForItems } from '../../services/consignmentFeesService.js';
import { openingBid } from '../../utils/consignmentAuctionMath.js';
import {
  feePolicyFrom,
  listingFee,
  originalListingFee,
  repeatCount,
  repeatListingFee,
  saleSplit,
} from '../../utils/consignmentFeePolicy.js';
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
import ConsignmentAuctionFeeFields from './ConsignmentAuctionFeeFields.jsx';

export default function ConsignmentAuctionStartModal({
  item, settings, isRelist = false, previousReserve = null, previouslyDelivered = false, onClose,
}) {
  const policy = feePolicyFrom(settings);
  const daysDefault = AUCTION_LENGTH_OPTIONS.includes(Number(settings?.auction_default_days))
    ? Number(settings.auction_default_days)
    : DEFAULT_AUCTION_DAYS;
  const lowerNeedsConsent = !(item.status === 'pending' && !item.intake_at);
  const sellerChoseAuction = item.sale_method === 'auction';
  const agreedAmount = Number(item.seller_payout) || 0;
  const lastReserve = Number(previousReserve) || agreedAmount;

  const [fees, setFees] = useState(item.fees || null);
  const [reserve, setReserve] = useState(item.seller_payout ?? '');
  const [commission, setCommission] = useState(policy.auctionCommissionPct);
  const [buyNow, setBuyNow] = useState(item.requested_buy_now ?? '');
  const [days, setDays] = useState(daysDefault);
  const [snap, setSnap] = useState(true);
  const [endsAt, setEndsAt] = useState(() => toLocalInputValue(defaultAuctionEnd(new Date(), daysDefault)));
  const [manualFee, setManualFee] = useState(null);
  const [feePaid, setFeePaid] = useState(true);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [consent, setConsent] = useState(CONSENT_METHODS[0]);
  const [atLegends, setAtLegends] = useState(
    previouslyDelivered || (item.sale_method === 'fixed' && Boolean(item.intake_at)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fees) return;
    loadFeesForItems([item.id])
      .then((byItem) => setFees(byItem[item.id] || []))
      .catch((err) => { setFees([]); setError(err.message); });
  }, [item.id]);

  const opening = useMemo(() => openingBid(reserve), [reserve]);
  const needsConsent = lowerNeedsConsent && opening > 0 && opening < agreedAmount;
  const originalFee = originalListingFee(fees, 'auction');
  const rule = isRelist
    ? repeatListingFee({
      originalFee: originalFee || listingFee(lastReserve, 'auction', policy),
      previousPrice: lastReserve,
      newPrice: opening,
      priorRepeats: repeatCount(fees, 'auction'),
      policy,
    })
    : null;
  const autoFee = rule ? rule.amount : listingFee(opening, 'auction', policy);
  const fee = manualFee ?? autoFee;
  const credit = originalFee || (isRelist ? 0 : Number(fee) || 0);
  const atOpening = saleSplit(opening, commission, credit);
  const atBuyNow = buyNow !== '' ? saleSplit(buyNow, commission, credit) : null;
  const lengthHours = endsAt ? hoursBetween(new Date(), endsAt) : 0;
  const feeUnpaid = Number(fee) > 0 && !feePaid;

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
        consent: needsConsent ? consent : null,
        feeNote: rule?.free ? rule.reason : null,
        atLegends,
      });
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const splitLine = (s) => `seller ${formatDollars(s.sellerFromSale)} · FRPL ${formatDollars(s.frplFromSale)}`
    + (s.credit ? ` (${commission}% minus the ${formatDollars(s.credit)} listing fee)` : '');

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-auction-title">
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-auction-title">{isRelist ? 'Relist' : 'Start'} auction · {itemLabel(item)}</h2>
        <p className="cs-hint">
          {item.name}. {sellerChoseAuction ? 'The seller asked for an auction. ' : ''}The auction goes live as soon as you save.
          {' '}Collect the listing fee first; sellers can pay it by Cash App or Venmo with {itemLabel(item)} in the note.
        </p>
        <label className="cs-check">
          <input type="checkbox" checked={atLegends} onChange={(e) => setAtLegends(e.target.checked)} />
          Item is already at Legends
        </label>
        <p className="cs-hint">
          {atLegends
            ? 'The winner gets their pay window as soon as the auction ends.'
            : `The seller keeps it. When it sells they have ${settings?.auction_delivery_days ?? 3} days to bring it to Legends; the winner's pay window starts when you mark it delivered.`}
        </p>
        {!sellerChoseAuction ? (
          <p className="cs-due">
            This item came in as a consignment with an agreed price of {formatDollars(agreedAmount)}. As an auction, that becomes
            the reserve and FRPL earns the greater of the listing fee or {commission}%. Confirm the reserve with the seller.
          </p>
        ) : null}

        <div className="cs-row">
          <div className="cs-field">
            <label>Reserve / opening bid ($)</label>
            <input type="number" step="0.01" min="1" value={reserve} onChange={(e) => setReserve(e.target.value)} required />
            {isRelist ? (
              <p className="cs-hint">
                Last reserve {formatDollars(lastReserve)}. Lowering it {policy.freeRepeatDropPct}% or more makes the first relist free.
              </p>
            ) : null}
          </div>
          <div className="cs-field">
            <label>FRPL commission (%)</label>
            <input type="number" step="0.5" min="0" max="99" value={commission} onChange={(e) => setCommission(e.target.value)} required />
          </div>
        </div>
        {needsConsent ? (
          <div className="cs-field">
            <label>Below the agreed {formatDollars(agreedAmount)}. How did the seller agree?</label>
            <select value={consent} onChange={(e) => setConsent(e.target.value)}>
              {CONSENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        ) : null}

        <div className="cs-auction-calc">
          <div>Bidding starts at <strong>{opening ? formatDollars(opening) : '—'}</strong></div>
          {opening ? <div className="cs-meta">At the reserve: {splitLine(atOpening)}</div> : null}
        </div>

        <div className="cs-field">
          <label>Buy It Now ($, optional)</label>
          <input type="number" step="5" min="0" value={buyNow} onChange={(e) => setBuyNow(e.target.value)} placeholder="Leave blank for none" />
          {atBuyNow ? (
            <span className="cs-hint">
              At Buy It Now: {splitLine(atBuyNow)}. Disappears once bidding reaches this price.
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

        <ConsignmentAuctionFeeFields
          isRelist={isRelist}
          fee={fee}
          onFeeChange={setManualFee}
          reason={fees ? (rule ? rule.reason : `${policy.auctionFeePct}% of the reserve, ${formatDollars(policy.auctionFeeMin)}–${formatDollars(policy.auctionFeeMax)}. Not refunded.`) : 'Checking fee history…'}
          feePaid={feePaid}
          setFeePaid={setFeePaid}
          method={method}
          setMethod={setMethod}
        />

        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy || !opening || !fees || feeUnpaid}>
            {busy ? 'Starting…' : 'Start auction'}
          </button>
          <button className="cs-btn-secondary" type="button" onClick={() => onClose(false)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
