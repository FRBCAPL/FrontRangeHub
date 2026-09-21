import React, { useState } from 'react';
import { DENVER_METRO_CASH_POOL } from '../../data/usaplDenverMetroCashPool.js';
import UsaplDenverMetroRulesModal from './UsaplDenverMetroRulesModal.jsx';
import UsaplFlyerLightbox from './UsaplFlyerLightbox.jsx';
import UsaplMetroText from './UsaplMetroText.jsx';
import './usaplDenverMetro.css';

export default function UsaplDenverMetroPromo({ promo }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="usapl-metro-promo">
      <button type="button" className="usapl-metro-promo-art" onClick={() => setOpen(true)}>
        <img src={promo.src} alt={promo.alt} />
      </button>
      <div className="usapl-metro-promo-copy">
        <h3>{promo.title}</h3>
        <ul>
            {promo.points.map((point) => (
              <UsaplMetroText key={point} as="li" text={point} />
            ))}
        </ul>
      </div>
      {open && promo.rules ? (
        <UsaplDenverMetroRulesModal promo={promo} onClose={() => setOpen(false)} />
      ) : null}
      {open && !promo.rules ? (
        <UsaplFlyerLightbox src={promo.src} alt={promo.alt} wide onClose={() => setOpen(false)} />
      ) : null}
    </article>
  );
}

export function UsaplDenverMetroCardArt() {
  return (
    <div className="usapl-night-flyer usapl-metro-card-art" aria-hidden="true">
      <img src={DENVER_METRO_CASH_POOL.src} alt="" />
    </div>
  );
}
