import React, { useState } from 'react';
import { CONSENT_METHODS, itemLabel } from '../../data/consignmentConstants.js';
import { changePayout } from '../../services/consignmentPayoutService.js';
import { usesShelfCommission } from '../../utils/consignmentFeePolicy.js';
import { formatDollars } from '../../utils/consignmentMoney.js';

export default function ConsignmentPayoutModal({ item, currentPayout, onClose, onChanged }) {
  const [amount, setAmount] = useState(currentPayout);
  const [consent, setConsent] = useState(CONSENT_METHODS[0]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lowering = Number(amount) < Number(currentPayout);
  const label = usesShelfCommission(item) ? 'agreed price' : 'Seller Payout';
  const title = usesShelfCommission(item) ? 'Agreed price' : 'Seller Payout';

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await changePayout(item.id, { newPayout: amount, consent: lowering ? consent : null, note });
      onChanged(Number(amount));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-modal" role="dialog" aria-labelledby="cs-payout-title">
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-payout-title">Change {label} · {itemLabel(item)}</h2>
        <p className="cs-hint">
          Current {label}: <strong>{formatDollars(currentPayout)}</strong>. Raising it is fine anytime,
          but lowering it requires the seller&apos;s agreement.
        </p>
        <div className="cs-field">
          <label>New {label} ($)</label>
          <input type="number" step="0.01" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        {lowering ? (
          <div className="cs-field">
            <label>How did the seller agree?</label>
            <select value={consent} onChange={(e) => setConsent(e.target.value)}>
              {CONSENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        ) : null}
        <div className="cs-field">
          <label>Note {lowering ? '(recommended)' : '(optional)'}</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={lowering ? 'e.g. Agreed to $450 at renewal, texted Oct 30' : ''}
          />
        </div>
        {error ? <p className="cs-error">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : `Save ${title.toLowerCase()}`}</button>
          <button className="cs-btn-secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
