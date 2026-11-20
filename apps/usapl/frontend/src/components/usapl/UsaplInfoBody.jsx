import React from 'react';
import { Link } from 'react-router-dom';
import { USAPL_LINKS } from '../../data/usaplConstants.js';
import { USAPL_INFO_FEATURES, usaplInfoTheme } from '../../data/usaplInfo.js';
import { USAPL_INFO_FAQ, USAPL_INFO_FAQ_INTRO } from '../../data/usaplInfoFaq.js';
import UsaplInfoList from './UsaplInfoList.jsx';

function FeatureExtras({ id }) {
  if (id === 'scoring') {
    return (
      <div className="usapl-actions usapl-info-cta">
        <a className="usapl-btn-secondary" href={USAPL_LINKS.scoringAndroid} target="_blank" rel="noreferrer">Scoring app · Android</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.scoringApple} target="_blank" rel="noreferrer">Scoring app · Apple</a>
        <Link className="usapl-btn-secondary" to="/usapl">League night video</Link>
      </div>
    );
  }
  if (id === 'fargo') {
    return (
      <div className="usapl-actions usapl-info-cta">
        <a className="usapl-btn-secondary" href={USAPL_LINKS.fargoRate} target="_blank" rel="noreferrer">FargoRate.com</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.fargoRateAndroid} target="_blank" rel="noreferrer">FargoRate · Android</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.fargoRateApple} target="_blank" rel="noreferrer">FargoRate · Apple</a>
      </div>
    );
  }
  if (id === 'sanction') {
    return (
      <div className="usapl-actions usapl-info-cta">
        <a className="usapl-btn-secondary" href={USAPL_LINKS.usaplOrg} target="_blank" rel="noreferrer">USAPL</a>
        <a className="usapl-btn-secondary" href={USAPL_LINKS.csiBcapl} target="_blank" rel="noreferrer">BCAPL</a>
        <Link className="usapl-btn-secondary" to="/usapl/divisions">Division list</Link>
      </div>
    );
  }
  if (id === 'events') {
    return (
      <div className="usapl-actions usapl-info-cta">
        <Link className="usapl-btn" to="/usapl/vegas-cup">Vegas Cup</Link>
      </div>
    );
  }
  return null;
}

function Lead({ id }) {
  const { lead, lead2 } = usaplInfoTheme(id);
  if (!lead && !lead2) return null;
  return (
    <p className="usapl-info-lead">
      {lead}
      {lead && lead2 ? <br /> : null}
      {lead2}
    </p>
  );
}

export default function UsaplInfoBody({ id }) {
  if (id === 'faq') {
    return (
      <>
        <Lead id={id} />
        <div className="usapl-info-faq-intro">
          {USAPL_INFO_FAQ_INTRO.map((para) => (
            <p key={para}>{para}</p>
          ))}
        </div>
        <div className="usapl-info-faq-list">
          {USAPL_INFO_FAQ.map((item, index) => {
            const [first, ...rest] = item.a;
            return (
              <details key={item.id} className="usapl-info-faq">
                <summary>
                  <span className="usapl-info-faq-num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="usapl-info-faq-q">{item.q}</span>
                </summary>
                <div className="usapl-info-faq-a">
                  {first ? <p className="usapl-info-faq-takeaway">{first}</p> : null}
                  {rest.length ? (
                    <div className="usapl-info-faq-notes">
                      {rest.map((para) => (
                        <p key={para}>{para}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>
      </>
    );
  }

  if (id === 'links') {
    return (
      <>
        <Lead id={id} />
        <div className="usapl-info-link-groups">
          <section className="usapl-info-link-group" aria-label="Official CSI">
            <h3 className="usapl-info-link-group-title">Official CSI</h3>
            <div className="usapl-actions usapl-info-cta usapl-info-link-grid">
              <a className="usapl-btn-secondary" href={USAPL_LINKS.csiRules} target="_blank" rel="noreferrer">Official CSI rules</a>
              <a className="usapl-btn-secondary" href={USAPL_LINKS.csiPolicies} target="_blank" rel="noreferrer">USAPL player handbook</a>
              <a className="usapl-btn-secondary" href={USAPL_LINKS.csiBcaplRules} target="_blank" rel="noreferrer">BCAPL rules page</a>
            </div>
          </section>
          <section className="usapl-info-link-group" aria-label="Other">
            <h3 className="usapl-info-link-group-title">Other</h3>
            <div className="usapl-actions usapl-info-cta usapl-info-link-grid">
              <a className="usapl-btn-secondary" href={USAPL_LINKS.bcaPool} target="_blank" rel="noreferrer">Billiard Congress of America</a>
              <a className="usapl-btn-secondary" href={USAPL_LINKS.bcaWpaRules} target="_blank" rel="noreferrer">BCA / WPA rules</a>
            </div>
          </section>
        </div>
      </>
    );
  }

  const group = USAPL_INFO_FEATURES.find((row) => row.id === id);
  if (!group) return null;

  return (
    <>
      <Lead id={id} />
      <UsaplInfoList items={group.items} />
      <FeatureExtras id={id} />
    </>
  );
}
