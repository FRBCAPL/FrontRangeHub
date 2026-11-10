import React, { useCallback, useEffect, useState } from 'react';
import { cancelShipping, loadMyShipments } from '../../services/consignmentShippingService.js';
import { canBuyerCancelShipment } from '../../utils/consignmentShipping.js';
import ConsignmentShipmentCard from './ConsignmentShipmentCard.jsx';

const NEXT_STEP = {
  requested: 'FRPL will email you a secure payment link.',
  invoiced: 'Pay with the secure link. FRPL ships after the payment clears.',
  paid: 'Paid. FRPL is packing it and will email you the tracking number.',
  shipped: 'On its way.',
  arrived: 'Delivered. Something wrong? Contact FRPL right away.',
};

/** "Shipping to me" section on the My offers & orders page. Hidden when there's nothing to show. */
export default function ConsignmentMyShipments({ userId }) {
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setRows(userId ? await loadMyShipments() : []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function cancel(s) {
    const pickup = s.auction_id ? ' You’ll pick it up and pay at Legends instead.' : '';
    if (!window.confirm(`Cancel the shipping request for ${s.item_name || 'this item'}?${pickup}`)) return;
    setBusyId(s.id);
    setError('');
    try {
      await cancelShipping(s.id);
      await load();
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
            extra={NEXT_STEP[s.status] ? <p className="cs-meta">{NEXT_STEP[s.status]}</p> : null}
          >
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
