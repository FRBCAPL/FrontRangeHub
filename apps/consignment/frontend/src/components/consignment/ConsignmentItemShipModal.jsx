import React, { useState } from 'react';
import { itemLabel } from '../../data/consignmentConstants.js';
import { saveItemShipPrice } from '../../services/consignmentShippingAdminService.js';
import { suggestedShipPrice } from '../../utils/consignmentShipping.js';
import ConsignmentModal from './ConsignmentModal.jsx';

/** Admin: can this item ship out of state, and for what flat shipping & handling charge. onClose(saved). */
export default function ConsignmentItemShipModal({ item, price, shippingOn, onClose }) {
  const [ships, setShips] = useState(price != null);
  const [amount, setAmount] = useState(String(price ?? suggestedShipPrice(item.category)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (ships && !(n > 0 && n <= 500)) { setError('Enter a shipping price from $1 to $500.'); return; }
    setBusy(true);
    setError('');
    try {
      await saveItemShipPrice(item.id, ships ? Math.round(n * 100) / 100 : null);
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConsignmentModal titleId="cs-item-ship-title" onClose={() => onClose(false)} busy={busy}>
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-item-ship-title">Shipping · {itemLabel(item)}</h2>
        <p className="cs-hint">{item.name}</p>
        {!shippingOn ? (
          <p className="cs-hint">Shipping is switched off (Settings → Shipping), so shoppers won’t see this until you turn it on.</p>
        ) : null}
        <label className="cs-check">
          <input type="checkbox" checked={ships} onChange={(e) => setShips(e.target.checked)} />
          <span>Can ship to buyers outside Colorado</span>
        </label>
        {ships ? (
          <div className="cs-field">
            <label htmlFor="cs-item-ship-price">Flat shipping &amp; handling ($)</label>
            <input
              id="cs-item-ship-price"
              type="number"
              min="1"
              max="500"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="cs-hint">
              Cover the label, box or cue tube, insurance and the ~3% Square fee. Cues ship in a tube about 60 inches long,
              so check the carrier’s oversize charges. Suggested for this category: ${suggestedShipPrice(item.category)}.
            </p>
          </div>
        ) : null}
        {error ? <p className="cs-error" role="alert">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <button className="cs-btn-secondary" type="button" onClick={() => onClose(false)} disabled={busy}>Cancel</button>
        </div>
      </form>
    </ConsignmentModal>
  );
}
