import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH, LEGENDS, LEGENDS_FULL_ADDRESS } from '../../data/consignmentConstants.js';
import { fillHowItWorks } from '../../data/consignmentHowItWorks.js';
import { SHIPPING_GUIDE } from '../../data/consignmentShippingGuide.js';
import { loadShippingInfo } from '../../services/consignmentShippingService.js';
import { formatDollars } from '../../utils/consignmentMoney.js';
import { SHIP_CATEGORIES, shipBase, shipPriceFor } from '../../utils/consignmentShipPrice.js';
import ConsignmentModal from './ConsignmentModal.jsx';
import './consignment-map-modal.css';

const EXAMPLE_VALUE = 400;

function ShippingOn({ info, onClose }) {
  const g = SHIPPING_GUIDE.on;
  const fill = (text) => fillHowItWorks(text, {
    shipDays: info.complaintDays,
    coverage: formatDollars(info.rules.includedCoverage),
    insurance: formatDollars(info.rules.insurancePer100),
  });
  const example = shipPriceFor({ category: 'cues', value: EXAMPLE_VALUE }, info.rules);
  return (
    <>
      <p className="cs-lede cs-ship-info-lede">{g.lede}</p>
      <p className="cs-ship-info-who"><strong>Who:</strong> {g.who}</p>
      <ol className="cs-ship-info-steps">
        {g.steps.map((step) => <li key={step}>{fill(step)}</li>)}
      </ol>
      <h3 className="cs-ship-info-sub">Shipping cost</h3>
      <p className="cs-hint">{fill(g.pricesIntro)}</p>
      <ul className="cs-ship-info-rates">
        {SHIP_CATEGORIES.map(([id, label]) => (
          <li key={id}><span>{label}</span><strong>{formatDollars(shipBase(id, info.rules))}</strong></li>
        ))}
      </ul>
      <p className="cs-hint">
        {fill(g.pricesNote)} Example: a {formatDollars(EXAMPLE_VALUE)} cue ships for {formatDollars(example)}.
      </p>
      <div className="cs-actions">
        <Link className="cs-btn" to={CONSIGNMENT_PATH} onClick={onClose}>Browse the shop</Link>
        <Link className="cs-btn-secondary" to={`${CONSIGNMENT_PATH}/my-offers`} onClick={onClose}>My offers &amp; orders</Link>
      </div>
    </>
  );
}

/** Home page badge: how shipping works, what it costs, and where pickup happens. */
export default function ConsignmentShippingInfoModal({ onClose, onShowMap }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let alive = true;
    loadShippingInfo().then((row) => { if (alive) setInfo(row); });
    return () => { alive = false; };
  }, []);

  const g = info?.enabled ? SHIPPING_GUIDE.on : SHIPPING_GUIDE.off;

  return (
    <ConsignmentModal titleId="cs-ship-info-title" onClose={onClose}>
      <div className="cs-modal-card cs-map-modal cs-ship-info">
        <div className="cs-map-head">
          <h2 id="cs-ship-info-title">🚚 {info ? g.title : 'Shipping'}</h2>
          <button type="button" className="cs-how-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {!info ? <p className="cs-hint">Loading…</p> : null}
        {info && info.enabled ? <ShippingOn info={info} onClose={onClose} /> : null}
        {info && !info.enabled ? <p className="cs-lede cs-ship-info-lede">{g.lede}</p> : null}
        {info ? (
          <div className="cs-ship-info-pickup">
            <div>
              <strong>Pickup at {LEGENDS.name}</strong>
              <p className="cs-meta">{LEGENDS_FULL_ADDRESS}</p>
            </div>
            <button type="button" className="cs-btn-secondary" onClick={onShowMap}>📍 Map &amp; directions</button>
          </div>
        ) : null}
      </div>
    </ConsignmentModal>
  );
}
