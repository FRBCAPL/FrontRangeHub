import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH, SPORTS } from '../../data/duezyOptions.js';
import DuezyAuthPreview, { PREVIEW_SAMPLES } from './DuezyAuthPreview.jsx';

const HANDLES = [
  'Partial payments',
  'Paying ahead',
  'Late balances from past weeks',
  'Make-up matches',
  'Byes',
  'Corrections with full history',
  'Who paid (Venmo, Zelle…)',
  'Co-treasurers & viewers',
];

/** Landing "See it in action": the real-world cases Duezy handles, between two sample weeks. */
export default function DuezyAuthShowcase() {
  return (
    <section className="dz-land-band">
      <DuezyAuthPreview sample={PREVIEW_SAMPLES.pool} className="dz-land-sample dz-land-sample--left" />
      <div className="dz-land-handles">
        <span className="dz-eyebrow">Dues made easy</span>
        <h2>You collect.<br />
        Duezy handles the messy stuff.</h2>
        <p className="dz-muted dz-small">Some things can make spreadsheets messy. <br />
        Duezy makes them easy.</p>
        <ul className="dz-auth-handles">{HANDLES.map((h) => <li key={h}>{h}</li>)}</ul>
        <div className="dz-sport-strip dz-sport-strip--sm" aria-label="Works for any league: pool, darts, bowling, racing, pickleball, soccer and more">
          <small>Works for any league:</small>
          {SPORTS.map((s) => (
            <span key={s.value} className="dz-sport-tip" data-tip={s.label} role="img" aria-label={s.label} tabIndex={0}>{s.icon}</span>
          ))}
        </div>
        <Link to={`${DUEZY_PATH}/demo`} className="dz-link dz-small dz-land-demo-link">Open the full demo league ›</Link>
      </div>
      <DuezyAuthPreview sample={PREVIEW_SAMPLES.darts} className="dz-land-sample dz-land-sample--right" />
    </section>
  );
}
