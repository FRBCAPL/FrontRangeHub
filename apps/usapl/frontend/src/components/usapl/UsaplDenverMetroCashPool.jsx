import React, { useState } from 'react';
import { DENVER_METRO_CASH_POOL as pool } from '../../data/usaplDenverMetroCashPool.js';
import UsaplDivisionFactsModal from './UsaplDivisionFactsModal.jsx';
import UsaplMetroText from './UsaplMetroText.jsx';
import './usaplDenverMetro.css';

export default function UsaplDenverMetroCashPool() {
  const [open, setOpen] = useState(false);
  const { example } = pool;
  return (
    <article className="usapl-metro-promo">
      <button type="button" className="usapl-metro-promo-art" onClick={() => setOpen(true)}>
        <img src={pool.src} alt={pool.alt} />
      </button>
      <div className="usapl-metro-promo-copy">
        <h3>{pool.title}</h3>
        <ul>
          {pool.points.map((point) => (
            <UsaplMetroText key={point} as="li" text={point} />
          ))}
        </ul>
      </div>
      {open ? (
        <UsaplDivisionFactsModal title={pool.heading} onClose={() => setOpen(false)} className="usapl-metro-rules-modal">
          <img className="usapl-metro-rules-art" src={pool.src} alt="" />
          <div className="usapl-metro-pool">
            <UsaplMetroText className="usapl-metro-pool-intro" text={pool.intro} />
            <UsaplMetroText className="usapl-metro-pool-basis" text={pool.basis} />
            <ul className="usapl-metro-pool-rows">
              {pool.rows.map((row) => (
                <li key={row.size}>
                  <span>{row.size}</span>
                  <strong>approximately {row.cash} in total cash</strong>
                </li>
              ))}
            </ul>
            <UsaplMetroText className="usapl-metro-pool-bye" text={pool.byeNote} />
            <UsaplMetroText className="usapl-metro-pool-split" text={pool.split} />
            <aside className="usapl-metro-pool-example">
              <p className="usapl-metro-pool-kicker">{example.kicker}</p>
              <UsaplMetroText className="usapl-metro-pool-lead" text={example.lead} />
              <p className="usapl-metro-pool-amount">{example.amount}</p>
              <p className="usapl-metro-pool-formats">{example.splitLine}</p>
              <UsaplMetroText className="usapl-metro-pool-footer" text={example.footer} />
            </aside>
            <UsaplMetroText className="usapl-metro-pool-disclaimer" text={pool.disclaimer} />
          </div>
        </UsaplDivisionFactsModal>
      ) : null}
    </article>
  );
}
