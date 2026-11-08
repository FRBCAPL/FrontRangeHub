import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH, LEGENDS } from '../../data/consignmentConstants.js';
import { currentUserId, onAuthChange, openHubLogin } from '../../services/consignmentAuctionService.js';
import { reserveGear } from '../../services/consignmentGearService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { GEAR_MAX_QTY, variantPrice } from '../../utils/consignmentGearMath.js';
import { withTax } from '../../utils/consignmentTax.js';
import useTaxRate from '../../hooks/useTaxRate.js';

/** Quantity + Reserve (in stock) or Special order (out of stock) for the chosen option. */
export default function ConsignmentGearReserveBox({ product, variant, onReserved }) {
  const [userId, setUserId] = useState(undefined);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const rate = useTaxRate();

  useEffect(() => {
    let alive = true;
    currentUserId().then((id) => { if (alive) setUserId(id); });
    const off = onAuthChange((id) => setUserId(id));
    return () => { alive = false; off(); };
  }, []);

  useEffect(() => { setConfirming(false); setError(''); setDone(null); }, [variant?.id]);

  const stock = Math.max(0, Number(variant?.stock) || 0);
  const special = stock < qty;

  if (!variant) return <p className="cs-gear-unavailable">That combination isn’t available. Try another option.</p>;
  if (special && !product.special_order) {
    return <p className="cs-gear-unavailable">Sold out. Check back soon, or ask FRPL when more are coming.</p>;
  }

  const each = variantPrice(product, variant);
  const total = withTax(each * qty, rate);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const res = await reserveGear(variant.id, qty, note.trim(), special);
      setDone(res);
      setConfirming(false);
      setNote('');
      onReserved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="cs-gear-box cs-gear-done" role="status">
        <strong>{done.kind === 'special' ? 'Special order sent!' : 'Reserved!'}</strong>
        <p>
          {done.kind === 'special'
            ? 'FRPL will order it and email you when it arrives at Legends.'
            : `Pick it up and pay at ${LEGENDS.name} by ${formatDateTime(done.hold_until)}.`}
        </p>
        <Link className="cs-btn-secondary" to={`${CONSIGNMENT_PATH}/my-offers`}>See my orders</Link>
      </div>
    );
  }

  return (
    <div className="cs-gear-box">
      <p className={`cs-gear-stock${special ? ' special' : ''}`}>
        {special
          ? `Special order${product.lead_time ? ` · usually ${product.lead_time}` : ''}${stock ? ` · only ${stock} in stock` : ''}`
          : `In stock at Legends${stock <= 3 ? ` · ${stock} left` : ''}`}
      </p>
      <label className="cs-gear-qty">
        Quantity
        <select value={qty} onChange={(e) => setQty(Number(e.target.value))} disabled={busy}>
          {Array.from({ length: GEAR_MAX_QTY }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      {userId === null ? (
        <button type="button" className="cs-btn" onClick={openHubLogin}>Log in to {special ? 'special order' : 'reserve'}</button>
      ) : null}
      {userId && !confirming ? (
        <button type="button" className="cs-btn" onClick={() => setConfirming(true)}>
          {special ? 'Special order' : 'Reserve for pickup'} · {formatDollars(total)}
        </button>
      ) : null}
      {userId && confirming ? (
        <div className="cs-gear-confirm">
          <p>
            {special
              ? 'FRPL orders it in and emails you when it’s at Legends. You pay when you pick it up.'
              : 'We’ll set it aside at Legends for a few days. You pay when you pick it up.'}
            {' '}Total {formatDollars(total)} {product.price_tax_included ? 'tax included' : 'with tax'}.
          </p>
          <label>
            Note for FRPL (optional)
            <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} />
          </label>
          <div className="cs-actions">
            <button type="button" className="cs-btn" onClick={submit} disabled={busy}>
              {busy ? 'Sending…' : special ? 'Confirm special order' : 'Confirm reservation'}
            </button>
            <button type="button" className="cs-btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>Back</button>
          </div>
        </div>
      ) : null}
      {error ? <p className="cs-error" role="alert">{error}</p> : null}
    </div>
  );
}
