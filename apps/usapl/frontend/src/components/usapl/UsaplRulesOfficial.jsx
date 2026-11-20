import React from 'react';
import { Link } from 'react-router-dom';
import { USAPL_LINKS } from '../../data/usaplConstants.js';

export default function UsaplRulesOfficial() {
  return (
    <section className="usapl-rule-card usapl-rule-card-official" aria-label="Full rulebooks">
      <p className="usapl-rule-official-kicker">Official books</p>
      <header className="usapl-rule-head">
        <h2>Full rulebooks</h2>
        <p className="usapl-rule-blurb">
          We play CSI / USAPL — with a few Front Range tweaks in the local by-laws.
        </p>
      </header>
      <div className="usapl-actions">
        <Link className="usapl-btn" to="/usapl/bylaws">FRUSAPL local by-laws</Link>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.csiRules} target="_blank" rel="noreferrer">Official CSI rules</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.csiPolicies} target="_blank" rel="noreferrer">USAPL player handbook</a>
        <Link className="usapl-btn-secondary" to="/usapl/info">League info &amp; FAQ</Link>
      </div>
    </section>
  );
}
