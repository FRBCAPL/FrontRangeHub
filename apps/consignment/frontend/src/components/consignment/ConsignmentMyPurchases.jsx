import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { itemLabel, LEGENDS_PLACE } from '../../data/consignmentConstants.js';
import { loadMyPurchases, PURCHASES_MISSING } from '../../services/consignmentPurchasesService.js';
import { formatDateTime } from '../../utils/consignmentAuctionDates.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { consignmentItemPath } from '../../utils/consignmentPaths.js';
import { PURCHASE_STEP_LABELS, boughtVia, purchaseStep, sortPurchases } from '../../utils/consignmentPurchases.js';
import { withTax } from '../../utils/consignmentTax.js';
import useTaxRate from '../../hooks/useTaxRate.js';
import './consignment-purchases.css';

function nextStep(p, step, taxed) {
  if (step === 'bring') {
    return `The seller brings it to Legends${p.delivery_due_at ? ` by ${formatDateTime(p.delivery_due_at)}` : ''}. FRPL lets you know when it’s there.`;
  }
  if (step === 'ready') return `Look it over and pay ${taxed} with tax at Legends by ${formatDateTime(p.payment_due_at)}.`;
  if (step === 'held') return `Pay ${taxed} with tax at Legends by ${formatDateTime(p.hold_until)}.`;
  return p.paid_at ? `Paid ${formatDateTime(p.paid_at)}. Enjoy!` : 'Paid. Enjoy!';
}

function PurchaseCard({ p, rate }) {
  const step = purchaseStep(p);
  const item = { item_number: p.item_number, category: p.category };
  const name = p.item_name || itemLabel(item) || 'Item';
  const taxed = formatDollars(withTax(p.price, rate));
  return (
    <article className="cs-gear-order">
      {p.photo
        ? <img className="cs-gear-order-photo" src={p.photo} alt="" loading="lazy" />
        : <div className="cs-gear-order-photo" aria-hidden="true">🎱</div>}
      <div>
        <h3>{p.item_number ? <Link to={consignmentItemPath(p.item_number)}>{name}</Link> : name}</h3>
        <p className="cs-meta">{[itemLabel(item), boughtVia(p)].filter(Boolean).join(' · ')}</p>
        <p>
          <span className={`cs-buy-status cs-buy-status-${step}`}>{PURCHASE_STEP_LABELS[step]}</span>{' '}
          <strong>{formatDollars(p.price)}</strong> <small>({taxed} with tax)</small>
        </p>
        <p className="cs-meta">{nextStep(p, step, taxed)}</p>
      </div>
    </article>
  );
}

/** Top of My offers & orders: auction wins and accepted offers to pick up at Legends. Hidden when there are none. */
export default function ConsignmentMyPurchases({ userId, reloadKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const rate = useTaxRate();

  useEffect(() => {
    let alive = true;
    if (!userId) { setRows([]); return undefined; }
    loadMyPurchases()
      .then((data) => { if (alive) { setRows(sortPurchases(data)); setError(''); } })
      .catch((err) => {
        if (!alive) return;
        setRows([]);
        setError(err.message === PURCHASES_MISSING ? '' : err.message);
      });
    return () => { alive = false; };
  }, [userId, reloadKey]);

  if (!rows.length && !error) return null;
  return (
    <section className="cs-mine-section cs-purchases" aria-labelledby="cs-my-purchases">
      <h2 id="cs-my-purchases">My purchases</h2>
      <p className="cs-hint">Pick up and pay at {LEGENDS_PLACE}. Give staff your name and the item number.</p>
      {error ? <p className="cs-error" role="alert">{error}</p> : null}
      <div className="cs-gear-orders">
        {rows.map((p) => <PurchaseCard key={`${p.kind}-${p.id}`} p={p} rate={rate} />)}
      </div>
    </section>
  );
}
