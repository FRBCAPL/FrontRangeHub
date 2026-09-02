import React from 'react';
import { USAPL_LINKS, USAPL_RULE_HIGHLIGHTS } from '../../data/usaplConstants.js';

export default function UsaplRulesPage() {
  return (
    <div className="usapl-page">
      <h1>Rules</h1>
      <p className="usapl-lede">Team captains are expected to know the rules and keep teammates on them.</p>

      <section className="usapl-card" style={{ marginTop: 16 }}>
        <h2>FRUSAPL highlights</h2>
        <ul>
          {USAPL_RULE_HIGHLIGHTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="usapl-card" style={{ marginTop: 14 }}>
        <h2>Official CSI / USAPL rules</h2>
        <p>Please see the player handbook and official CSI rules. Local highlights do not replace them.</p>
        <div className="usapl-actions">
          <a className="usapl-btn" href={USAPL_LINKS.csiPolicies} target="_blank" rel="noreferrer">USAPL player handbook</a>
          <a className="usapl-btn-secondary" href={USAPL_LINKS.csiRules} target="_blank" rel="noreferrer">Official CSI rules</a>
        </div>
      </section>
    </div>
  );
}
