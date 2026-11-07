import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { itemLabel } from '../../data/consignmentConstants.js';
import { releaseOfferHold, respondToOffer, withdrawOffer } from '../../services/consignmentOffersService.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import {
  canAnswerOffer, counterError, offerHistoryLines, offerMinimum, offerStatusLabel,
} from '../../utils/consignmentOfferMath.js';
import { consignmentItemPath } from '../../utils/consignmentPaths.js';

/** One offer with the actions this viewer can take. view: buyer | seller | admin. */
export default function ConsignmentOfferCard({ offer, view, onChanged }) {
  const [countering, setCountering] = useState(false);
  const [counter, setCounter] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const item = offer.item || {};
  const answer = canAnswerOffer(offer, view);
  const isAuction = item.sale_method === 'auction' || Boolean(offer.auction_id);
  const by = view === 'admin' ? 'admin' : view;
  const counterRules = {
    by,
    current: offer.amount,
    minimum: offerMinimum(offer.asking_price),
    asking: offer.asking_price,
  };

  const run = async (fn, question) => {
    if (question && !window.confirm(question)) return;
    setBusy(true);
    setError('');
    try {
      await fn();
      setCountering(false);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const acceptQuestion = view === 'buyer'
    ? `Accept ${formatDollars(offer.amount)} for ${item.name}? You’re agreeing to buy it at this price (plus tax).`
    : `Accept ${formatDollars(offer.amount)} for ${item.name}?${offer.payout != null ? ` The seller receives ${formatDollars(offer.payout)}.` : ''} ${
      isAuction ? 'The auction ends and the buyer wins it.' : 'The item is held for the buyer.'}`;
  let acceptText = `Accept ${formatDollars(offer.amount)}`;
  if (view === 'seller' && offer.payout != null) acceptText += ` (you’d receive ${formatDollars(offer.payout)})`;

  const sendCounter = (e) => {
    e.preventDefault();
    const problem = counterError(counter, counterRules);
    if (problem) { setError(problem); return; }
    run(() => respondToOffer(offer.id, 'counter', counter, note.trim()));
  };

  return (
    <li className={`cs-offer-card cs-offer-${offer.status}${answer ? ' cs-offer-yours' : ''}`}>
      <div className="cs-offer-head">
        {item.photo ? <img src={item.photo} alt="" loading="lazy" /> : <span className="cs-offer-ph" aria-hidden="true">🎱</span>}
        <div>
          <p className="cs-offer-title">
            {item.item_number ? <Link to={consignmentItemPath(item.item_number)}>{item.name}</Link> : item.name}
            {' '}<span className="cs-meta">{itemLabel(item)}</span>
          </p>
          <p className="cs-offer-amount">
            <strong>{formatDollars(offer.amount)}</strong>
            <span className="cs-meta"> · {isAuction ? 'opening bid' : 'asking'} {formatDollars(offer.asking_price)}</span>
          </p>
          <p className={`cs-offer-status${answer ? ' cs-offer-status-turn' : ''}`}>
            {offerStatusLabel(offer, view)}
            {offer.status === 'open' ? ` · until ${formatDateTime(offer.expires_at)}` : ''}
            {offer.status === 'accepted' && offer.hold_until ? ` · held until ${formatDateTime(offer.hold_until)}` : ''}
            {offer.status === 'accepted' && !offer.hold_until ? ' · won the auction by offer' : ''}
          </p>
        </div>
      </div>

      {view !== 'buyer' && offer.buyer_name ? (
        <p className="cs-meta">
          Buyer: {offer.buyer_name}{offer.buyer_email ? ` · ${offer.buyer_email}` : ''}
          {view === 'admin' && offer.seller_name ? ` · Seller: ${offer.seller_name}${offer.seller_has_account ? '' : ' (no account; answer for them)'}` : ''}
        </p>
      ) : null}
      {view === 'admin' && offer.payout != null ? <p className="cs-meta">Seller would receive {formatDollars(offer.payout)}</p> : null}
      {offer.message ? <p className="cs-offer-message">“{offer.message}”</p> : null}

      <ol className="cs-offer-history">
        {offerHistoryLines(offer.history).map((h) => (
          <li key={h.key}>
            {h.text} <span className="cs-meta">{formatDateTime(h.at)}</span>
            {h.note ? <span className="cs-offer-message"> “{h.note}”</span> : null}
          </li>
        ))}
      </ol>

      {view === 'buyer' && offer.status === 'accepted' && offer.hold_until ? (
        <p className="cs-offer-good">Pay {formatDollars(offer.amount)} + tax at Legends by {formatDateTime(offer.hold_until)}. Give staff your name and the item number.</p>
      ) : null}

      {answer ? (
        <div className="cs-actions cs-offer-actions">
          <button type="button" className="cs-btn" disabled={busy} onClick={() => run(() => respondToOffer(offer.id, 'accept'), acceptQuestion)}>
            {acceptText}
          </button>
          <button type="button" className="cs-btn-secondary" disabled={busy} onClick={() => { setCountering((v) => !v); setError(''); }}>
            Counter
          </button>
          <button
            type="button"
            className="cs-btn-secondary"
            disabled={busy}
            onClick={() => run(() => respondToOffer(offer.id, 'decline'), `Decline the ${formatDollars(offer.amount)} offer?`)}
          >
            Decline
          </button>
        </div>
      ) : null}

      {answer && countering ? (
        <form className="cs-offer-counter" onSubmit={sendCounter} noValidate>
          <label htmlFor={`cs-counter-${offer.id}`}>
            Counter ({by === 'buyer'
              ? `below ${formatDollars(offer.amount)}, at least ${formatDollars(counterRules.minimum)}`
              : `above ${formatDollars(offer.amount)}, up to ${formatDollars(offer.asking_price)}`})
          </label>
          <input
            id={`cs-counter-${offer.id}`}
            type="number"
            inputMode="decimal"
            step="0.01"
            value={counter}
            onChange={(e) => { setCounter(e.target.value); setError(''); }}
          />
          <label htmlFor={`cs-counter-note-${offer.id}`}>Note (optional)</label>
          <input id={`cs-counter-note-${offer.id}`} type="text" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" className="cs-btn" disabled={busy}>{busy ? 'Sending…' : 'Send counter'}</button>
        </form>
      ) : null}

      {view === 'buyer' && offer.status === 'open' ? (
        <button
          type="button"
          className="cs-btn-link"
          disabled={busy}
          onClick={() => run(() => withdrawOffer(offer.id), 'Withdraw this offer?')}
        >
          Withdraw offer
        </button>
      ) : null}
      {view === 'admin' && offer.status === 'accepted' && !offer.auction_id ? (
        <button
          type="button"
          className="cs-btn-link"
          disabled={busy}
          onClick={() => run(() => releaseOfferHold(offer.id), 'End the hold? The item goes back on sale at its full price and the buyer is emailed.')}
        >
          Buyer backed out: end hold
        </button>
      ) : null}
      {error ? <p className="cs-error" role="alert">{error}</p> : null}
    </li>
  );
}
