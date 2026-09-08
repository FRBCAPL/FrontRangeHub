import React from 'react';
import { Link } from 'react-router-dom';
import { USAPL_LINKS } from '../../data/usaplConstants.js';
import { USAPL_INFO_FEATURES } from '../../data/usaplInfo.js';
import { USAPL_INFO_FAQ, USAPL_INFO_FAQ_INTRO } from '../../data/usaplInfoFaq.js';
import UsaplInfoList from './UsaplInfoList.jsx';

function FeatureExtras({ id }) {
  if (id === 'scoring') {
    return (
      <div className="usapl-actions">
        <a className="usapl-btn-secondary" href={USAPL_LINKS.scoringAndroid} target="_blank" rel="noreferrer">Scoring app · Android</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.scoringApple} target="_blank" rel="noreferrer">Scoring app · Apple</a>
        <Link className="usapl-btn-secondary" to="/usapl">League night video</Link>
      </div>
    );
  }
  if (id === 'fargo') {
    return (
      <div className="usapl-actions">
        <a className="usapl-btn-secondary" href={USAPL_LINKS.fargoRate} target="_blank" rel="noreferrer">FargoRate.com</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.fargoRateAndroid} target="_blank" rel="noreferrer">FargoRate · Android</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.fargoRateApple} target="_blank" rel="noreferrer">FargoRate · Apple</a>
      </div>
    );
  }
  if (id === 'sanction') {
    return (
      <div className="usapl-actions">
        <a className="usapl-btn-secondary" href={USAPL_LINKS.usaplOrg} target="_blank" rel="noreferrer">USAPL</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.csiBcapl} target="_blank" rel="noreferrer">BCAPL</a>
        <Link className="usapl-btn-secondary" to="/usapl/divisions">Division list</Link>
      </div>
    );
  }
  if (id === 'events') {
    return (
      <div className="usapl-actions">
        <Link className="usapl-btn" to="/usapl/vegas-cup">Vegas Cup</Link>
      </div>
    );
  }
  return null;
}

export default function UsaplInfoBody({ id }) {
  if (id === 'faq') {
    return (
      <>
        {USAPL_INFO_FAQ_INTRO.map((para) => (
          <p key={para}>{para}</p>
        ))}
        <div className="usapl-info-faq-list">
          {USAPL_INFO_FAQ.map((item) => (
            <article key={item.id} className="usapl-info-faq">
              <h3>{item.q}</h3>
              {item.a.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </article>
          ))}
        </div>
      </>
    );
  }

  if (id === 'links') {
    return (
      <div className="usapl-actions">
        <a className="usapl-btn-secondary" href={USAPL_LINKS.bcaPool} target="_blank" rel="noreferrer">Billiard Congress of America</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.bcaWpaRules} target="_blank" rel="noreferrer">BCA / WPA rules</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.csiBcaplRules} target="_blank" rel="noreferrer">BCAPL rules page</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.csiRules} target="_blank" rel="noreferrer">USAPL rules page</a>
      </div>
    );
  }

  const group = USAPL_INFO_FEATURES.find((row) => row.id === id);
  if (!group) return null;

  return (
    <>
      <UsaplInfoList items={group.items} />
      <FeatureExtras id={id} />
    </>
  );
}
