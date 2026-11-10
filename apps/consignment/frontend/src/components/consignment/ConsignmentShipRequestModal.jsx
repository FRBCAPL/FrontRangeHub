import React, { useState } from 'react';
import { itemLabel } from '../../data/consignmentConstants.js';
import { requestShipping } from '../../services/consignmentShippingService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { SHIP_STATES, shipAddressError, shipTotal } from '../../utils/consignmentShipping.js';
import ConsignmentModal from './ConsignmentModal.jsx';

const EMPTY = { name: '', line1: '', line2: '', city: '', state: '', zip: '', phone: '' };

function Field({ id, label, value, onChange, ...rest }) {
  return (
    <div className="cs-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

/** Buyer: shipping address + the order total. onClose(true) after the request is saved. */
export default function ConsignmentShipRequestModal({ item, itemPrice, shipPrice, complaintDays, isAuction, onClose }) {
  const [addr, setAddr] = useState(EMPTY);
  const [note, setNote] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (value) => setAddr((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const problem = shipAddressError(addr);
    if (problem) { setError(problem); return; }
    if (!agree) { setError('Tick the box to agree to the shipping terms.'); return; }
    setBusy(true);
    setError('');
    try {
      await requestShipping(item.id, addr, note.trim());
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConsignmentModal titleId="cs-ship-title" onClose={() => onClose(false)} busy={busy}>
      <form className="cs-modal-card cs-form cs-ship-form" onSubmit={submit}>
        <h2 id="cs-ship-title">Ship {itemLabel(item) || 'this item'} to me</h2>
        <div className="cs-ship-sum">
          <div><span>{isAuction ? 'Winning bid' : 'Item'}</span><strong>{formatDollars(itemPrice)}</strong></div>
          <div><span>Shipping &amp; handling</span><strong>{formatDollars(shipPrice)}</strong></div>
          <div className="cs-ship-sum-total"><span>Total</span><strong>{formatDollars(shipTotal(itemPrice, shipPrice))}</strong></div>
          <p className="cs-hint">
            No Colorado sales tax on orders shipped out of state.
            {isAuction ? '' : ' If FRPL accepted an offer from you on this item, your offer price is used.'}
          </p>
        </div>
        <Field id="cs-ship-name" label="Name" value={addr.name} onChange={set('name')} autoComplete="name" maxLength={100} required />
        <Field id="cs-ship-line1" label="Street address" value={addr.line1} onChange={set('line1')} autoComplete="address-line1" maxLength={120} required />
        <Field id="cs-ship-line2" label="Apt, suite (optional)" value={addr.line2} onChange={set('line2')} autoComplete="address-line2" maxLength={120} />
        <div className="cs-row">
          <Field id="cs-ship-city" label="City" value={addr.city} onChange={set('city')} autoComplete="address-level2" maxLength={60} required />
          <div className="cs-field">
            <label htmlFor="cs-ship-state">State</label>
            <select id="cs-ship-state" value={addr.state} onChange={(e) => set('state')(e.target.value)} autoComplete="address-level1" required>
              <option value="">Choose…</option>
              {SHIP_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </div>
          <Field id="cs-ship-zip" label="ZIP" value={addr.zip} onChange={set('zip')} autoComplete="postal-code" inputMode="numeric" maxLength={10} required />
        </div>
        <Field id="cs-ship-phone" label="Phone for the carrier (optional)" value={addr.phone} onChange={set('phone')} autoComplete="tel" type="tel" maxLength={30} />
        <div className="cs-field">
          <label htmlFor="cs-ship-note">Note for FRPL (optional)</label>
          <textarea id="cs-ship-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <p className="cs-hint">
          Lower 48 states and DC only. Colorado buyers pick up and pay at Legends.
        </p>
        <label className="cs-check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            FRPL emails me a secure payment link (Square) and ships after it’s paid, with tracking. Items are sold as-is;
            I’ll report any problem within {complaintDays} days of delivery.
          </span>
        </label>
        {error ? <p className="cs-error" role="alert">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send shipping request'}</button>
          <button className="cs-btn-secondary" type="button" onClick={() => onClose(false)} disabled={busy}>Cancel</button>
        </div>
      </form>
    </ConsignmentModal>
  );
}
