import React from 'react';
import { Link } from 'react-router-dom';
import { USAPL_LINKS } from '../../data/usaplConstants.js';
import { USAPL_RULE_GROUPS } from '../../data/usaplRules.js';
import UsaplRulesGroup from './UsaplRulesGroup.jsx';

export default function UsaplRulesPage() {
  return (
    <div className="usapl-page usapl-rules-page">
      <p className="usapl-kicker">Front Range USA Pool League</p>
      <h1>Rules</h1>
      <p className="usapl-lede">
        Team captains are expected to know the rules and keep teammates up to date.<br />
        Here are some important highlights. <br /> 
        Please refer to the official CSI rule book and USAPL Handbook for the most up to date information.<br />
        You can find the links to the official rules below.
      </p>

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
          <h2>Official CSI / USAPL rules</h2>
          <p className="usapl-rule-blurb">FRUSAPL follows the CSI rules and USAPL Handbook. <br />
          With minor modifications made for weekly play as outlined in the FRUSAPL local by-laws.</p>
          <div className="usapl-actions">
            <Link className="usapl-btn" to="/usapl/bylaws">FRUSAPL local by-laws</Link>
            <a className="usapl-btn-secondary" href={USAPL_LINKS.csiPolicies} target="_blank" rel="noreferrer">USAPL player handbook</a>
            <a className="usapl-btn-secondary" href={USAPL_LINKS.csiRules} target="_blank" rel="noreferrer">Official CSI rules</a>
          </div>
        </article>
      </div>
    </div>
  );
}
