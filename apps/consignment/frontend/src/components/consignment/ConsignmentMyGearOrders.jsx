import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import { cancelGearOrder, loadMyGearOrders } from '../../services/consignmentGearService.js';
import { canBuyerCancel } from '../../utils/consignmentGearMath.js';
import ConsignmentGearOrderCard from './ConsignmentGearOrderCard.jsx';

/** "Reserved new gear" section on the My offers & orders page. Hidden when there's nothing to show. */
export default function ConsignmentMyGearOrders({ userId }) {
  const [orders, setOrders] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setOrders(userId ? await loadMyGearOrders() : []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function cancel(order) {
    if (!window.confirm(`Cancel your ${order.kind === 'special' ? 'special order' : 'reservation'} for ${order.product_name}?`)) return;
    setBusyId(order.id);
    setError('');
    try {
      await cancelGearOrder(order.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!orders.length) return null;
  return (
    <section className="cs-mine-section" aria-labelledby="cs-my-gear">
      <h2 id="cs-my-gear">Reserved new gear</h2>
      <p className="cs-hint">
        Pay and pick up at Legends. You can cancel until FRPL orders a special order from the supplier.
        {' '}<Link to={`${CONSIGNMENT_PATH}/new`}>Browse new gear</Link>
      </p>
      {error ? <p className="cs-error" role="alert">{error}</p> : null}
      <div className="cs-gear-orders">
        {orders.map((o) => (
          <ConsignmentGearOrderCard key={o.id} order={o}>
            {canBuyerCancel(o) ? (
              <button type="button" className="cs-btn-secondary" disabled={busyId === o.id} onClick={() => cancel(o)}>
                {busyId === o.id ? 'Cancelling…' : 'Cancel'}
              </button>
            ) : null}
          </ConsignmentGearOrderCard>
        ))}
      </div>
    </section>
  );
}
