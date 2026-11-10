import React, { useState } from 'react';
import { itemLabel } from '../../data/consignmentConstants.js';
import { saveItemShipping } from '../../services/consignmentShippingAdminService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { DEFAULT_SHIP_RULES, shipBase, shipPriceFor } from '../../utils/consignmentShipPrice.js';
import ConsignmentModal from './ConsignmentModal.jsx';

const AUCTION_EXAMPLES = [200, 500, 1000];

/**
 * Admin: can this item ship out of state, at the automatic price (category base + insurance on the sale price)
 * or a fixed price. option = { fixed } when it ships now, else null. onClose(saved).
 */
export default function ConsignmentItemShipModal({ item, option, rules = DEFAULT_SHIP_RULES, shippingOn, onClose }) {
  const [ships, setShips] = useState(Boolean(option));
  const [mode, setMode] = useState(option?.fixed != null ? 'fixed' : 'auto');
  const [amount, setAmount] = useState(String(option?.fixed ?? shipBase(item.category, rules)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isAuction = item.sale_method === 'auction';
  const price = Number(item.selling_price) || 0;
  const auto = (value) => formatDollars(shipPriceFor({ category: item.category, value }, rules));

  const save = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (ships && mode === 'fixed' && !(n > 0 && n <= 500)) { setError('Enter a shipping price from $1 to $500.'); return; }
    setBusy(true);
    setError('');
    try {
      await saveItemShipping(item.id, { ships, fixed: mode === 'fixed' ? Math.round(n * 100) / 100 : null });
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
          <>
            <label className="cs-check">
              <input type="radio" name="cs-ship-mode" checked={mode === 'auto'} onChange={() => setMode('auto')} />
              <span>
                Automatic price{' '}
                <span className="cs-hint">
                  {isAuction
                    ? `(set by the winning bid: ${AUCTION_EXAMPLES.map((v) => `${formatDollars(v)} → ${auto(v)}`).join(', ')})`
                    : `(${auto(price)} at ${formatDollars(price)})`}
                </span>
              </span>
            </label>
            <label className="cs-check">
              <input type="radio" name="cs-ship-mode" checked={mode === 'fixed'} onChange={() => setMode('fixed')} />
              <span>Fixed price for this item</span>
            </label>
            {mode === 'fixed' ? (
              <div className="cs-field">
                <label htmlFor="cs-item-ship-price">Shipping &amp; handling ($)</label>
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
              </div>
            ) : null}
            <p className="cs-hint">
              Automatic = the category price from Settings → Shipping, plus insurance on the sale price, rounded up to the
              next $5. Use a fixed price for odd sizes (e.g. a cue in a big hard case).
            </p>
          </>
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
