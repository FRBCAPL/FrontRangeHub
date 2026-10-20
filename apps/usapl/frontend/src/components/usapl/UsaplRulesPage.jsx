import React from 'react';
import { Link } from 'react-router-dom';
import { USAPL_LINKS } from '../../data/usaplConstants.js';
import { USAPL_RULE_GROUPS } from '../../data/usaplRules.js';
import UsaplLeagueMark from './UsaplLeagueMark.jsx';
import UsaplRulesGroup from './UsaplRulesGroup.jsx';
import UsaplRulesIntro from './UsaplRulesIntro.jsx';

export default function UsaplRulesPage() {
  return (
    <div className="usapl-brand-page">
      <UsaplLeagueMark />
      <div className="usapl-page usapl-rules-page">
      <UsaplRulesIntro />
      <div className="usapl-rules-grid">
        {USAPL_RULE_GROUPS.map((group) => (
          <UsaplRulesGroup
            key={group.id}
            title={group.title}
            blurb={group.blurb}
            items={group.items}
          />
        ))}
        <article className="usapl-rule-card usapl-rule-card-official">
          <header className="usapl-rule-head">
            <h2>The rest of the book</h2>
            <p className="usapl-rule-blurb">
              We play CSI / USAPL — with a few Front Range tweaks in the local by-laws.
            </p>
          </header>
          <div className="usapl-actions">
            <Link className="usapl-btn" to="/usapl/bylaws">FRUSAPL local by-laws</Link>
            <Link className="usapl-btn-secondary" to="/usapl/info">League info &amp; FAQ</Link>
            <a className="usapl-btn-secondary" href={USAPL_LINKS.csiPolicies} target="_blank" rel="noreferrer">USAPL player handbook</a>
            <a className="usapl-btn-secondary" href={USAPL_LINKS.csiRules} target="_blank" rel="noreferrer">Official CSI rules</a>
          </div>
        </article>
      </div>
      </div>
    </div>
  );
}
