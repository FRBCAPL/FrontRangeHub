import React, { useState } from 'react';
import ConsignmentGearOrdersAdmin from './ConsignmentGearOrdersAdmin.jsx';
import ConsignmentGearProductsAdmin from './ConsignmentGearProductsAdmin.jsx';

/** Admin "New gear" tab: reservations first (what needs doing), products second. */
export default function ConsignmentGearPanel() {
  const [view, setView] = useState('orders');
  return (
    <section className="cs-gear-admin" aria-labelledby="cs-gear-admin-title">
      <h2 id="cs-gear-admin-title">New gear</h2>
      <div className="cs-gear-admin-tabs" role="group" aria-label="New gear view">
        <button type="button" className={view === 'orders' ? 'cs-btn' : 'cs-btn-secondary'} onClick={() => setView('orders')}>
          Reservations
        </button>
        <button type="button" className={view === 'products' ? 'cs-btn' : 'cs-btn-secondary'} onClick={() => setView('products')}>
          Products
        </button>
      </div>
      {view === 'orders' ? <ConsignmentGearOrdersAdmin /> : <ConsignmentGearProductsAdmin />}
    </section>
  );
}
