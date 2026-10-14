import React from 'react';
import { Link } from 'react-router-dom';
import { CONSIGNMENT_PATH } from '../../data/consignmentConstants.js';
import {
  HOME_COMPARE,
  HOME_COMPARE_TITLE,
  HOME_HERO,
  HOME_PATHS,
  HOW_IT_WORKS_FOOTER,
  homeSteps,
  HOW_IT_WORKS_TABS,
} from '../../data/consignmentHowItWorks.js';
import useHowItWorksValues from '../../hooks/useHowItWorksValues.js';
import useShopCounts from '../../hooks/useShopCounts.js';
import './consignment-home.css';

const pathTo = (to) => (to ? `${CONSIGNMENT_PATH}/${to}` : CONSIGNMENT_PATH);

/** Live count on the Consign / Auction cards, linking to the shop filtered to that kind. */
function PathCount({ tab, counts }) {
  if (!counts) return null;
  const [n, show, one, many] = tab === 'consign'
    ? [counts.case, 'case', 'item in the case now', 'items in the case now']
    : tab === 'auction'
      ? [counts.auctions, 'auctions', 'on the table now (auction)', 'on the table now (auctions)']
      : [null];
  if (n == null) return null;
  return (
    <Link className="cs-home-count" to={`${CONSIGNMENT_PATH}?show=${show}`}>
      <strong>{n}</strong> {n === 1 ? one : many}
    </Link>
  );
}

function StepsSection({ tab, fill, cta }) {
  return (
    <details className="cs-home-section cs-home-fold" id={`cs-home-${tab.id}`}>
      <summary>
        <h2>{tab.label}</h2>
        <span className="cs-home-fold-hint" aria-hidden="true" />
      </summary>
      <p className="cs-home-intro">{fill(tab.intro)}</p>
      <ol className="cs-home-steps">
        {homeSteps(tab.steps).map((step) => <li key={step}>{fill(step)}</li>)}
      </ol>
      {cta ? (
        <div className="cs-actions">
          <Link className="cs-btn" to={pathTo(cta.to)}>{cta.cta}</Link>
        </div>
      ) : null}
    </details>
  );
}

function openSection(tabId) {
  const el = document.getElementById(`cs-home-${tabId}`);
  if (!el) return;
  el.open = true;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function ConsignmentHome() {
  const fill = useHowItWorksValues();
  const counts = useShopCounts();
  const ctaFor = (tabId) => HOME_PATHS.find((p) => p.tab === tabId);

  return (
    <div className="cs-page cs-home">
      <header className="cs-home-hero">
        <p className="cs-kicker">{HOME_HERO.kicker}</p>
        <h1>{HOME_HERO.title}</h1>
        <p className="cs-lede">{HOME_HERO.lede}</p>
        <span className="cs-legends">Available at Legends Brews & Cues</span>
      </header>

      <div className="cs-home-paths">
        {HOME_PATHS.map((p) => (
          <article key={p.tab} className={`cs-home-path is-${p.tab}`}>
            <span className="cs-home-icon" aria-hidden="true">{p.icon}</span>
            <h2>{p.title}</h2>
            <PathCount tab={p.tab} counts={counts} />
            <p>{fill(p.blurb)}</p>
            <div className="cs-home-path-actions">
              <Link className="cs-btn" to={pathTo(p.to)}>{p.cta}</Link>
              <a className="cs-home-more" href={`#cs-home-${p.tab}`} onClick={(e) => { e.preventDefault(); openSection(p.tab); }}>
                How it works ↓
              </a>
            </div>
          </article>
        ))}
      </div>

      <section className="cs-home-section" aria-labelledby="cs-home-compare-title">
        <h2 id="cs-home-compare-title">{HOME_COMPARE_TITLE}</h2>
        <div className="cs-home-compare">
          {HOME_COMPARE.map((c) => (
            <div key={c.tab} className={`cs-home-compare-col is-${c.tab}`}>
              <h3>{c.title}</h3>
              <ul>
                {c.lines.map((line) => <li key={line}>{fill(line)}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {HOW_IT_WORKS_TABS.map((tab) => (
        <StepsSection key={tab.id} tab={tab} fill={fill} cta={ctaFor(tab.id)} />
      ))}

      <p className="cs-hint cs-home-foot">{fill(HOW_IT_WORKS_FOOTER)}</p>
    </div>
  );
}
