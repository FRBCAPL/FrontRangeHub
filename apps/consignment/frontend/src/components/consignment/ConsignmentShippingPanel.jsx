import React, { useCallback, useEffect, useRef, useState } from 'react';
import { markSold } from '../../services/consignmentService.js';
import {
  checkSquarePayment, loadAuctionForPayment, loadItemForSale, loadShipmentsAdmin, updateShipment, voidSquareLink,
} from '../../services/consignmentShippingAdminService.js';
import { needsSaleRecorded } from '../../utils/consignmentShipping.js';
import ConsignmentAuctionPaidModal from './ConsignmentAuctionPaidModal.jsx';
import ConsignmentShipmentActionModal from './ConsignmentShipmentActionModal.jsx';
import ConsignmentShipmentCard from './ConsignmentShipmentCard.jsx';
import ConsignmentShipmentWarnings from './ConsignmentShipmentWarnings.jsx';
import ConsignmentSoldModal from './ConsignmentSoldModal.jsx';
import useConsignmentConfirm from '../../hooks/useConsignmentConfirm.js';

export const SHIPPED_PAYMENT_METHOD = 'Square (online)';

const CHECK_RESULTS = {
  unpaid: 'Square shows no payment yet.',
  short: 'Square shows a payment for less than the total. It was not marked paid; check it in Square.',
  cancelled: 'Square shows a payment, but this request was cancelled. Refund it in Square.',
};

/** [action, label] buttons for a shipment's next step. */
function actionsFor(s) {
  const cancel = ['cancel', 'Cancel'];
  if (s.status === 'requested') return [['square', 'Send Square link'], ['invoiced', 'Use my own link'], ['paid', 'Paid another way'], cancel];
  if (s.status === 'invoiced' && s.square_link_id) return [['check', 'Check payment'], ['square', 'New Square link'], cancel];
  if (s.status === 'invoiced') return [['square', 'Send Square link'], ['invoiced', 'Change link'], ['paid', 'Paid'], cancel];
  if (needsSaleRecorded(s)) return [['record', 'Record sale']];
  if (s.status === 'paid') return [['shipped', 'Shipped']];
  if (s.status === 'shipped') return [['arrived', 'Delivered']];
  return [];
}

/** Admin → Shipping: out-of-state orders, each with its next step. */
export default function ConsignmentShippingPanel({ shippingOn }) {
  const [scope, setScope] = useState('open');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(null);
  const [sale, setSale] = useState(null);
  const requestRef = useRef(0);
  const { confirm, prompt } = useConsignmentConfirm();

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await loadShipmentsAdmin(scope);
      if (request === requestRef.current) setRows(data);
    } catch (err) {
      if (request === requestRef.current) setError(err.message);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  async function run(s, fn) {
    setBusyId(s.id);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  /** Opens the usual Sold / Auction paid screen. markPaid: also mark the shipment paid afterwards (not paid online). */
  function openSale(s, markPaid) {
    if (s.auction_id && !s.delivered_at) {
      setError('Mark the item delivered to Legends on the Auctions tab first.');
      return;
    }
    run(s, async () => {
      const record = s.auction_id ? await loadAuctionForPayment(s.auction_id) : await loadItemForSale(s.item_id);
      setSale({ shipment: s, record, markPaid });
    });
  }

  async function markPaid(s) {
    if (s.item_status === 'sold') {
      const ok = await confirm({
        title: `Mark the shipment for ${s.item_name} paid?`,
        message: 'The sale is already recorded.',
        confirmLabel: 'Mark paid',
      });
      if (!ok) return;
      run(s, () => updateShipment(s.id, 'paid'));
      return;
    }
    openSale(s, true);
  }

  function checkPayment(s) {
    run(s, async () => {
      const { result } = await checkSquarePayment(s.id);
      if (CHECK_RESULTS[result]) throw new Error(CHECK_RESULTS[result]);
    });
  }

  async function act(s, action) {
    if (['invoiced', 'shipped', 'square'].includes(action)) { setStep({ shipment: s, action }); return; }
    if (action === 'paid') { markPaid(s); return; }
    if (action === 'record') { openSale(s, false); return; }
    if (action === 'check') { checkPayment(s); return; }
    if (action === 'arrived') {
      const ok = await confirm({
        title: `Mark ${s.item_name} delivered?`,
        message: 'The buyer’s window to report a problem starts now.',
        confirmLabel: 'Delivered',
      });
      if (!ok) return;
    }
    let note = '';
    if (action === 'cancel') {
      const answer = await prompt({
        title: `Cancel the shipping request for ${s.item_name}?`,
        message: 'The buyer gets an email.',
        inputLabel: 'Reason for the buyer (optional)',
        confirmLabel: 'Cancel request',
        cancelLabel: 'Keep it',
      });
      if (answer === null) return;
      note = answer;
    }
    run(s, async () => {
      if (action === 'cancel' && s.square_link_id) await voidSquareLink(s.id);
      await updateShipment(s.id, action, { note });
    });
  }

  const afterSale = (s, paid) => (paid ? run(s, () => updateShipment(s.id, 'paid')) : load());
  const todo = rows.filter((r) => ['requested', 'invoiced', 'paid'].includes(r.status)).length;
  return (
    <section aria-labelledby="cs-ship-admin-title">
      <h2 id="cs-ship-admin-title">Shipping</h2>
      <p className="cs-hint">
        Buyers outside Colorado. Steps: Send Square link → the buyer pays (marked paid automatically) → Record sale
        (Square fee filled in) → pack, photograph and ship from Legends → Shipped with tracking → Delivered. The seller can
        be paid once the buyer’s window to report a problem ends. These sales skip the Legends register and have no sales tax.
      </p>
      {!shippingOn ? <p className="cs-meta">Shipping is switched off for shoppers (Settings → Shipping).</p> : null}
      <div className="cs-offer-scope" role="group" aria-label="Which shipping requests">
        <button type="button" className={scope === 'open' ? 'cs-btn' : 'cs-btn-secondary'} onClick={() => setScope('open')}>Open</button>
        <button type="button" className={scope === 'all' ? 'cs-btn' : 'cs-btn-secondary'} onClick={() => setScope('all')}>Last 90 days</button>
      </div>
      {!loading && rows.length ? <p className="cs-meta">{todo} need a step from FRPL</p> : null}
      {error ? <p className="cs-error" role="alert">{error}</p> : null}
      {loading && !rows.length ? <p className="cs-meta">Loading…</p> : null}
      {!loading && !error && !rows.length ? <p className="cs-meta">No {scope === 'open' ? 'open ' : ''}shipping requests.</p> : null}
      <div className="cs-gear-orders">
        {rows.map((s) => (
          <ConsignmentShipmentCard
            key={s.id}
            shipment={s}
            extra={(
              <>
                <p className="cs-meta">
                  <strong>{s.buyer_name || 'Buyer'}</strong>
                  {s.buyer_email ? <> · <a href={`mailto:${s.buyer_email}`}>{s.buyer_email}</a></> : null}
                  {s.buyer_phone ? <> · <a href={`tel:${s.buyer_phone}`}>{s.buyer_phone}</a></> : null}
                </p>
                <ConsignmentShipmentWarnings s={s} />
              </>
            )}
          >
            {actionsFor(s).map(([action, label]) => (
              <button
                key={action + label}
                type="button"
                className={action === 'cancel' ? 'cs-btn-secondary' : 'cs-btn'}
                disabled={busyId === s.id}
                onClick={() => act(s, action)}
              >
                {label}
              </button>
            ))}
          </ConsignmentShipmentCard>
        ))}
      </div>
      {step ? (
        <ConsignmentShipmentActionModal
          shipment={step.shipment}
          action={step.action}
          onClose={(saved) => { setStep(null); if (saved) load(); }}
        />
      ) : null}
      {sale && sale.shipment.auction_id ? (
        <ConsignmentAuctionPaidModal
          auction={sale.record}
          defaultMethod={SHIPPED_PAYMENT_METHOD}
          defaultFee={sale.shipment.square_fee}
          onClose={(saved) => { const { shipment, markPaid: paid } = sale; setSale(null); if (saved) afterSale(shipment, paid); }}
        />
      ) : null}
      {sale && !sale.shipment.auction_id ? (
        <ConsignmentSoldModal
          item={sale.record}
          defaultMethod={SHIPPED_PAYMENT_METHOD}
          defaultFee={sale.shipment.square_fee}
          onClose={() => setSale(null)}
          onSave={async (vals) => {
            await markSold(sale.record, vals);
            afterSale(sale.shipment, sale.markPaid);
          }}
        />
      ) : null}
    </section>
  );
}
