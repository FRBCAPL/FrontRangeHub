import React, { useState } from 'react';
import { sendSquareLink, updateShipment } from '../../services/consignmentShippingAdminService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { SHIP_CARRIERS, shipmentTotal, validPaymentLink } from '../../utils/consignmentShipping.js';
import ConsignmentModal from './ConsignmentModal.jsx';

const TITLES = { square: 'Send Square link', invoiced: 'Use my own link', shipped: 'Shipped' };
const BUTTONS = { square: 'Create link & email buyer', invoiced: 'Send to buyer', shipped: 'Mark shipped' };

/**
 * Admin: action "square" (the server creates the Square link), "invoiced" (paste your own link)
 * or "shipped" (tracking). onClose(saved).
 */
export default function ConsignmentShipmentActionModal({ shipment: s, action, onClose }) {
  const square = action === 'square';
  const invoicing = action === 'invoiced';
  const [link, setLink] = useState(s.payment_link || '');
  const [carrier, setCarrier] = useState(s.carrier || SHIP_CARRIERS[0]);
  const [tracking, setTracking] = useState(s.tracking_number || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    if (invoicing && link.trim() && !validPaymentLink(link)) { setError('The payment link must start with https://'); return; }
    if (action === 'shipped' && !tracking.trim()) { setError('Enter the tracking number.'); return; }
    setBusy(true);
    setError('');
    try {
      if (square) await sendSquareLink(s.id, note.trim());
      else {
        await updateShipment(s.id, action, invoicing
          ? { link: link.trim(), note: note.trim() }
          : { carrier, tracking: tracking.trim(), note: note.trim() });
      }
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConsignmentModal titleId="cs-ship-action-title" onClose={() => onClose(false)} busy={busy}>
      <form className="cs-modal-card cs-form" onSubmit={save}>
        <h2 id="cs-ship-action-title">{TITLES[action]} · {s.item_name}</h2>
        {square ? (
          <p className="cs-hint">
            FRPL’s Square account creates a secure payment link for <strong>{formatDollars(shipmentTotal(s))}</strong>{' '}
            ({formatDollars(s.item_price)} item + {formatDollars(s.shipping_price)} shipping &amp; handling, no sales tax) and the buyer
            gets it by email. When they pay, this shipment is marked paid automatically with Square’s fee filled in.
            {s.square_link_id ? ' The old link stops working.' : ''}
          </p>
        ) : null}
        {invoicing ? (
          <>
            <p className="cs-hint">
              Create a Square payment link or invoice for <strong>{formatDollars(shipmentTotal(s))}</strong> ({formatDollars(s.item_price)} item
              + {formatDollars(s.shipping_price)} shipping &amp; handling, no sales tax) and paste it here. The buyer gets it by email and
              on My offers &amp; orders. If Square emails the invoice itself, you can leave the link blank.
            </p>
            <div className="cs-field">
              <label htmlFor="cs-ship-link">Payment link</label>
              <input id="cs-ship-link" type="url" placeholder="https://square.link/…" value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} />
            </div>
          </>
        ) : null}
        {action === 'shipped' ? (
          <>
            <p className="cs-hint">The buyer gets an email with the tracking link.</p>
            <div className="cs-row">
              <div className="cs-field">
                <label htmlFor="cs-ship-carrier">Carrier</label>
                <select id="cs-ship-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                  {SHIP_CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="cs-field">
                <label htmlFor="cs-ship-tracking">Tracking number</label>
                <input id="cs-ship-tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={60} required />
              </div>
            </div>
          </>
        ) : null}
        <div className="cs-field">
          <label htmlFor="cs-ship-admin-note">Note for the buyer (optional)</label>
          <textarea id="cs-ship-admin-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error ? <p className="cs-error" role="alert">{error}</p> : null}
        <div className="cs-actions">
          <button className="cs-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : BUTTONS[action]}</button>
          <button className="cs-btn-secondary" type="button" onClick={() => onClose(false)} disabled={busy}>Cancel</button>
        </div>
      </form>
    </ConsignmentModal>
  );
}
