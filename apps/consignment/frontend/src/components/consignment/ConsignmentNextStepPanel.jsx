import React, { useState } from 'react';
import { PICKUP_GRACE_DAYS, SELLER_CHOICES } from '../../data/consignmentConstants.js';
import { chooseNextStep } from '../../services/consignmentSellerService.js';
import { AUCTION_DAYS } from '../../utils/consignmentAuctionDates.js';
import { auctionRelistFee, DEFAULT_FEE_POLICY, listingFee } from '../../utils/consignmentFeePolicy.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import ConsignmentFeePayCodes from './ConsignmentFeePayCodes.jsx';
import './consignment-next-step.css';

function policyFor(item) {
  const p = item.relist_policy || {};
  return {
    ...DEFAULT_FEE_POLICY,
    ...(p.free_drop_pct != null ? { freeRepeatDropPct: Number(p.free_drop_pct) } : {}),
    ...(p.repeat_fee_pct != null ? { repeatFeePct: Number(p.repeat_fee_pct) } : {}),
  };
}

/** Highest reserve that still counts as a free relist. */
function freeReserveLimit(previous, dropPct) {
  return Math.floor(Number(previous) * (1 - dropPct / 100) * 100) / 100;
}

/** After an unsold auction: the seller picks relist, fixed price or keep it. */
export default function ConsignmentNextStepPanel({ item, settings, onDone }) {
  const a = item.auction;
  const policy = policyFor(item);
  const previous = Number(a.reserve) || Number(item.seller_payout) || 0;
  const freeLimit = freeReserveLimit(previous, policy.freeRepeatDropPct);
  const originalFee = Number(item.original_fee) || listingFee(previous, 'auction', policy);
  const atLegends = Boolean(a.delivered_at);
  const graceDays = Number(settings?.pickup_grace_days ?? PICKUP_GRACE_DAYS);

  const [editing, setEditing] = useState(!a.seller_choice);
  const [choice, setChoice] = useState(a.seller_choice || 'relist');
  const [reserve, setReserve] = useState(a.seller_choice_reserve ?? freeLimit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const rule = auctionRelistFee({ originalFee, previousReserve: previous, newReserve: reserve, policy });

  const submit = async (e) => {
    e.preventDefault();
    if (choice === 'relist' && rule.free && !window.confirm(
      `Start a new ${AUCTION_DAYS}-day auction now with a ${formatDollars(reserve)} reserve? Bidders can see it right away.`,
    )) return;
    setBusy(true);
    setError('');
    try {
      await chooseNextStep(item.id, choice, choice === 'relist' ? reserve : null);
      setEditing(false);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    const savedRule = a.seller_choice === 'relist'
      ? auctionRelistFee({ originalFee, previousReserve: previous, newReserve: a.seller_choice_reserve, policy })
      : null;
    return (
      <section className="cs-next" aria-label="Your next step">
        <p className="cs-next-picked">
          You picked <strong>{SELLER_CHOICES[a.seller_choice]}</strong>
          {a.seller_choice === 'relist' ? ` with a ${formatDollars(a.seller_choice_reserve)} reserve` : ''}.
        </p>
        <p className="cs-meta">
          {a.seller_choice === 'relist'
            ? `Pay the ${formatDollars(savedRule?.amount)} relist fee and FRPL will start your new ${AUCTION_DAYS}-day auction.`
            : 'FRPL will confirm it and let you know.'}
        </p>
        {a.seller_choice === 'relist' && savedRule?.amount > 0 ? (
          <ConsignmentFeePayCodes item={item} amount={savedRule.amount} kind="relist" />
        ) : null}
        <button type="button" className="cs-btn-secondary" onClick={() => setEditing(true)}>Change my choice</button>
      </section>
    );
  }

  return (
    <form className="cs-next" onSubmit={submit} aria-label="Choose what happens next">
      <p className="cs-next-title">What would you like to do?</p>
      <div className="cs-next-options" role="radiogroup">
        {Object.entries(SELLER_CHOICES).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={choice === id}
            className={`cs-next-option${choice === id ? ' active' : ''}`}
            onClick={() => setChoice(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {choice === 'relist' ? (
        <div className="cs-next-detail">
          <label className="cs-field">
            <span>New reserve ($)</span>
            <input type="number" inputMode="decimal" step="0.01" min="1" value={reserve} onChange={(e) => setReserve(e.target.value)} required />
          </label>
          <p className={rule.free ? 'cs-next-free' : 'cs-next-fee'}>
            {rule.free
              ? `Free: you lowered it ${rule.dropPct}%. Your new ${AUCTION_DAYS}-day auction starts as soon as you confirm.`
              : `Relist fee ${formatDollars(rule.amount)} (${policy.repeatFeePct}% of your original listing fee). `
                + `Lower the reserve to ${formatDollars(freeLimit)} or less to relist for free.`}
          </p>
          <p className="cs-meta">
            Last reserve {formatDollars(previous)}. Every relist is free when you lower the reserve {policy.freeRepeatDropPct}% or more.
          </p>
        </div>
      ) : null}
      {choice === 'fixed' ? (
        <p className="cs-next-detail cs-meta">
          FRPL will agree a shop price with you, and the item goes in the case at Legends.
        </p>
      ) : null}
      {choice === 'keep' ? (
        <p className="cs-next-detail cs-meta">
          {atLegends
            ? `Pick it up at Legends within ${graceDays} days; FRPL will let you know it’s ready.`
            : 'Nothing to pick up; you still have it.'}
        </p>
      ) : null}

      {error ? <p className="cs-error">{error}</p> : null}
      <div className="cs-next-actions">
        <button type="submit" className="cs-btn" disabled={busy}>
          {busy ? 'Saving…' : choice === 'relist' && rule.free ? 'Relist free now' : 'Confirm'}
        </button>
        {a.seller_choice ? (
          <button type="button" className="cs-btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
        ) : null}
      </div>
    </form>
  );
}
