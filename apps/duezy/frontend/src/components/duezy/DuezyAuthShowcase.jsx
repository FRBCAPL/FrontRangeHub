import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH, SPORTS } from '../../data/duezyOptions.js';
import DuezyAuthPreview, { PREVIEW_SAMPLES } from './DuezyAuthPreview.jsx';
import DuezyTip from './DuezyTip.jsx';

const HANDLES = [
  ['Partial payments', 'A team pays $10 of $20? Record what they gave. The rest stays on their row until it’s paid.'],
  ['Paying ahead', 'Record next week’s dues early and the team shows as paid ahead.'],
  ['Late balances from past weeks', 'Missed weeks stay on the team’s row until they’re paid, so nothing slips through.'],
  ['Make-up matches', 'Match postponed? Mark it a make-up. Dues are still owed but don’t count as late until it’s played.'],
  ['Byes', 'Team sits out a week? Mark a bye and nothing is owed that night.'],
  ['Corrections with full history', 'Fix a mistake anytime. Every change is logged with who made it and when.'],
  ['Who paid (Venmo, Zelle…)', 'Note which player sent the money, handy when matching your Venmo or bank history.'],
  ['Co-treasurers & viewers', 'Invite a treasurer who can record payments, or a viewer who can see everything but change nothing.'],
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
        <ul className="dz-auth-handles">
          {HANDLES.map(([label, tip]) => <DuezyTip key={label} as="li" tip={tip}>{label}</DuezyTip>)}
        </ul>
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
