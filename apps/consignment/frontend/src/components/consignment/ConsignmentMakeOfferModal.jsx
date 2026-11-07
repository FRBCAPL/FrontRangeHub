import React, { useState } from 'react';
import { makeOffer } from '../../services/consignmentOffersService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { offerError } from '../../utils/consignmentOfferMath.js';
import ConsignmentModal from './ConsignmentModal.jsx';

export default function ConsignmentMakeOfferModal({ itemId, itemName, terms, onClose, onSent }) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isAuction = terms.sale_method === 'auction';
  const rules = { minimum: terms.minimum, asking: terms.asking, saleMethod: terms.sale_method };

  const send = async (e) => {
    e.preventDefault();
    const problem = offerError(amount, rules);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError('');
    try {
      await makeOffer(itemId, amount, message.trim());
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConsignmentModal titleId="cs-offer-title" onClose={onClose} busy={busy}>
      <form className="cs-modal-card cs-form cs-offer-form" onSubmit={send} noValidate>
        <h2 id="cs-offer-title">Make an offer</h2>
        <p className="cs-hint">
          {itemName}: {isAuction ? 'opening bid' : 'asking'} <strong>{formatDollars(terms.asking)}</strong>.
          Offers start at <strong>{formatDollars(terms.minimum)}</strong> (half {isAuction ? 'the opening bid' : 'the price'}).
        </p>
        <div className="cs-field">
          <label htmlFor="cs-offer-amount">Your offer ($, before tax)</label>
          <input
            id="cs-offer-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={terms.minimum}
            max={Number(terms.asking) - 0.01}
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(''); }}
            required
          />
        </div>
        <div className="cs-field">
          <label htmlFor="cs-offer-note">Note to the seller (optional)</label>
          <textarea id="cs-offer-note" rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <ul className="cs-offer-rules">
          <li>The seller has {terms.offer_days} days to accept, decline or counter. We’ll email you either way.</li>
          {isAuction
            ? <li>If it’s accepted, you’ve won the auction at your price and pay at Legends when the item arrives.</li>
            : <li>If it’s accepted, the item is held for you for {terms.hold_days} days. Pay at Legends (plus tax) and take it home.</li>}
          <li>An accepted offer is a promise to buy, so only offer what you’ll pay.</li>
        </ul>
        {error ? <p className="cs-error" role="alert">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send offer'}</button>
          <button className="cs-btn-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
      </form>
    </ConsignmentModal>
  );
}
