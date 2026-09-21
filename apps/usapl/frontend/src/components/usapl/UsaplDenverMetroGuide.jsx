import React from 'react';
import { DENVER_METRO_PROMOS, DENVER_METRO_SNAPSHOT } from '../../data/usaplDenverMetroCash.js';
import UsaplDenverMetroCashPool from './UsaplDenverMetroCashPool.jsx';
import UsaplDenverMetroPromo from './UsaplDenverMetroPromo.jsx';
import UsaplDenverMetroVegasNote from './UsaplDenverMetroVegasNote.jsx';
import UsaplMetroText from './UsaplMetroText.jsx';
import './usaplDenverMetro.css';

export default function UsaplDenverMetroGuide() {
  return (
    <section className="usapl-metro-guide">
      <UsaplDenverMetroVegasNote />
      <p className="usapl-metro-kicker">Introductory cash session</p>
      <dl className="usapl-metro-snapshot">
        {DENVER_METRO_SNAPSHOT.map((row) => (
          <div key={row.label}>
            <UsaplMetroText as="dt" text={row.label} />
            <UsaplMetroText as="dd" text={row.value} />
          </div>
        ))}
      </dl>
      <div className="usapl-metro-promos">
        <UsaplDenverMetroCashPool />
        {DENVER_METRO_PROMOS.map((promo) => (
          <UsaplDenverMetroPromo key={promo.id} promo={promo} />
        ))}
      </div>
    </section>
  );
}
