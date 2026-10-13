import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';

/** Landing hero: headline, what Duezy is (tracks, doesn't collect), and the two calls to action. */
export default function DuezyAuthPitch({ onStart, onLogin }) {
  return (
    <section className="dz-land-hero">
      <span className="dz-eyebrow">Free for 30 days · no card needed</span>
      <h1>League dues, <span className="dz-gradient-text">without the spreadsheet.</span></h1>
      <p className="dz-land-sub">
        Duezy tracks who’s paid, who owes and where the money went. Teams keep paying you the way they do now —
        cash, Venmo, Zelle — and you record it in one tap. No payment-processing fees — no money passes through Duezy.
      </p>
      <div className="dz-land-ctas">
        <Link to={`${DUEZY_PATH}/demo`} className="dz-btn dz-btn--ghost dz-land-cta">Try the live demo</Link>
        <button type="button" className="dz-btn dz-btn--primary dz-land-cta" onClick={onStart}>Start free — 30 days</button>
        <button type="button" className="dz-btn dz-btn--ghost dz-land-cta" onClick={onLogin}>Log in</button>
      </div>
    </section>
  );
}
