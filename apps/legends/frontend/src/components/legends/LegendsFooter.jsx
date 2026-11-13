import React from 'react';
import { Link } from 'react-router-dom';
import { footerNav, site } from '../../data/legendsSite.js';
import { Eyebrow } from './LegendsUi.jsx';
import VisitFacts from './VisitFacts.jsx';

export default function LegendsFooter() {
  return (
    <footer className="lg-footer">
      <div className="lg-footer__inner">
        <div>
          <img src="/legends/legends-wordmark.png" alt="" width="940" height="788" className="lg-footer__logo" loading="lazy" />
          <p className="lg-display lg-footer__name">{site.name}</p>
          <p className="lg-footer__blurb">A pool hall and bar in Colorado Springs. Pool comes first.</p>
          <div className="lg-mt-6">
            <VisitFacts compact />
          </div>
        </div>
        <nav aria-label="Legends footer">
          <Eyebrow>Explore</Eyebrow>
          <ul className="lg-footer__links">
            {footerNav.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <Eyebrow>Rewards</Eyebrow>
          <p className="lg-footer__blurb">Legends Rewards membership is free.</p>
          <Link to="/legends/rewards" className="lg-footer__cta">
            About Legends Rewards
          </Link>
        </div>
      </div>
    </footer>
  );
}
