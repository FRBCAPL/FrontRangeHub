import React, { useCallback, useEffect, useState } from 'react';
import { cancelShipping, loadMyShipments } from '../../services/consignmentShippingService.js';
import { canBuyerCancelShipment } from '../../utils/consignmentShipping.js';
import { buyerShipNote, problemWindowEndsAt } from '../../utils/consignmentShipAcceptance.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import ConsignmentShipmentCard from './ConsignmentShipmentCard.jsx';
import ConsignmentBuyerShipActions from './ConsignmentBuyerShipActions.jsx';
import useConsignmentConfirm from '../../hooks/useConsignmentConfirm.js';
import useShippingInfo from '../../hooks/useShippingInfo.js';

const NEXT_STEP = {
  requested: 'FRPL will email you a secure payment link.',
  invoiced: 'Pay with the secure link. FRPL ships after the payment clears.',
  paid: 'Paid. FRPL is packing it and will email you the tracking number.',
};

function nextStep(s, days) {
  const note = buyerShipNote(s);
  if (note) return note;
  if (s.status === 'shipped') {
    return `On its way. When it arrives, look it over and tap “Got it” if it’s as described, or report a problem within ${days} days of delivery.`;
  }
  if (s.status === 'arrived') {
    const ends = problemWindowEndsAt(s, days);
    return ends && ends.getTime() > Date.now()
      ? `Delivered. Look it over: tap “Got it” if it’s as described, or report a problem by ${formatDateTime(ends)}.`
      : 'Delivered. Something wrong? Message FRPL with Contact us.';
  }
  return NEXT_STEP[s.status] || '';
}

/** "Shipping to me" section on the My offers & orders page. Hidden when there's nothing to show. */
export default function ConsignmentMyShipments({ userId, onChanged }) {
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const { confirm } = useConsignmentConfirm();
  const { complaintDays } = useShippingInfo();

  const load = useCallback(async () => {
    setRows(userId ? await loadMyShipments() : []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function cancel(s) {
    const ok = await confirm({
      title: `Cancel the shipping request for ${s.item_name || 'this item'}?`,
      message: s.auction_id ? 'You’ll pick it up and pay at Legends instead.' : '',
      confirmLabel: 'Cancel request',
      cancelLabel: 'Keep it',
    });
    if (!ok) return;
    setBusyId(s.id);
    setError('');
    try {
      await cancelShipping(s.id);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!rows.length) return null;
  return (
    <section className="cs-mine-section" aria-labelledby="cs-my-shipments">
      <h2 id="cs-my-shipments">Shipping to me</h2>
      <p className="cs-hint">Orders shipped outside Colorado. You pay online with the link FRPL sends; there’s no Colorado sales tax.</p>
      {error ? <p className="cs-error" role="alert">{error}</p> : null}
      <div className="cs-gear-orders">
        {rows.map((s) => (
          <ConsignmentShipmentCard
            key={s.id}
            shipment={s}
            extra={nextStep(s, complaintDays) ? <p className="cs-meta">{nextStep(s, complaintDays)}</p> : null}
          >
            <ConsignmentBuyerShipActions shipment={s} complaintDays={complaintDays} onDone={load} onError={setError} />
            {s.status === 'invoiced' && s.payment_link ? (
              <a className="cs-btn" href={s.payment_link} target="_blank" rel="noopener noreferrer">Pay now</a>
            ) : null}
            {canBuyerCancelShipment(s) ? (
              <button type="button" className="cs-btn-secondary" disabled={busyId === s.id} onClick={() => cancel(s)}>
                {busyId === s.id ? 'Cancelling…' : 'Cancel shipping'}
              </button>
            ) : null}
            {s.status === 'invoiced' && !canBuyerCancelShipment(s) ? (
              <p className="cs-meta">Changed your mind? Don’t pay the link, and message FRPL to cancel.</p>
            ) : null}
          </ConsignmentShipmentCard>
        ))}
      </div>
    </section>
  );
}
