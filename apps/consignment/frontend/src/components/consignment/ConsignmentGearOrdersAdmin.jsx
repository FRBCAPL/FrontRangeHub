import React, { useCallback, useEffect, useRef, useState } from 'react';
import { loadGearOrdersAdmin, updateGearOrder } from '../../services/consignmentGearAdminService.js';
import ConsignmentGearOrderCard from './ConsignmentGearOrderCard.jsx';

const ACTIONS = {
  requested: [['ordered', 'Mark ordered'], ['ready', 'Arrived'], ['cancel', 'Cancel']],
  ordered: [['ready', 'Arrived'], ['cancel', 'Cancel']],
  held: [['picked_up', 'Picked up & paid'], ['extend', 'Extend hold'], ['cancel', 'Cancel']],
  ready: [['picked_up', 'Picked up & paid'], ['extend', 'Extend hold'], ['cancel', 'Cancel']],
};

const PROMPTS = {
  ordered: 'Optional note for the customer (e.g. expected date):',
  ready: 'Optional note for the customer:',
  cancel: 'Reason for the customer (optional). They get an email:',
};

/** Admin: reservations and special orders, with the next step for each. */
export default function ConsignmentGearOrdersAdmin() {
  const [scope, setScope] = useState('open');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const rows = await loadGearOrdersAdmin(scope);
      if (request === requestRef.current) setOrders(rows);
    } catch (err) {
      if (request === requestRef.current) setError(err.message);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  async function act(order, action) {
    let note = '';
    if (PROMPTS[action]) {
      const answer = window.prompt(PROMPTS[action], '');
      if (answer === null) return;
      note = answer;
    } else if (action === 'picked_up' && !window.confirm(`Mark ${order.product_name} picked up and paid?`)) {
      return;
    }
    setBusyId(order.id);
    setError('');
    try {
      await updateGearOrder(order.id, action, note.trim());
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const toOrder = orders.filter((o) => o.status === 'requested').length;
  const pickups = orders.filter((o) => o.status === 'held' || o.status === 'ready').length;
  return (
    <section aria-labelledby="cs-gear-orders-title">
      <h3 id="cs-gear-orders-title">Reservations &amp; special orders</h3>
      <p className="cs-hint">
        In-stock reservations are held for pickup, then go back on the shelf if nobody comes. Special orders: order from
        the supplier, mark Ordered, then Arrived when it’s at Legends (the customer gets an email at each step).
      </p>
      <div className="cs-offer-scope" role="group" aria-label="Which reservations">
        <button type="button" className={scope === 'open' ? 'cs-btn' : 'cs-btn-secondary'} onClick={() => setScope('open')}>Open</button>
        <button type="button" className={scope === 'all' ? 'cs-btn' : 'cs-btn-secondary'} onClick={() => setScope('all')}>Last 90 days</button>
      </div>
      {!loading && orders.length ? <p className="cs-meta">{toOrder} to order · {pickups} waiting for pickup</p> : null}
      {error ? <p className="cs-error" role="alert">{error}</p> : null}
      {loading && !orders.length ? <p className="cs-meta">Loading…</p> : null}
      {!loading && !error && !orders.length ? <p className="cs-meta">No {scope === 'open' ? 'open ' : ''}reservations.</p> : null}
      <div className="cs-gear-orders">
        {orders.map((o) => (
          <ConsignmentGearOrderCard
            key={o.id}
            order={o}
            buyer={(
              <p className="cs-meta">
                <strong>{o.buyer_name || 'Customer'}</strong>
                {o.buyer_email ? <> · <a href={`mailto:${o.buyer_email}`}>{o.buyer_email}</a></> : null}
                {o.buyer_phone ? <> · <a href={`tel:${o.buyer_phone}`}>{o.buyer_phone}</a></> : null}
              </p>
            )}
          >
            {(ACTIONS[o.status] || []).map(([action, label]) => (
              <button
                key={action}
                type="button"
                className={action === 'cancel' ? 'cs-btn-secondary' : 'cs-btn'}
                disabled={busyId === o.id}
                onClick={() => act(o, action)}
              >
                {label}
              </button>
            ))}
          </ConsignmentGearOrderCard>
        ))}
      </div>
    </section>
  );
}
