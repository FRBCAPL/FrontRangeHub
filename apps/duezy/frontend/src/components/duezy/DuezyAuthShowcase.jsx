import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH, SPORTS } from '../../data/duezyOptions.js';
import DuezyAuthPreview from './DuezyAuthPreview.jsx';

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

/** Landing "See it in action": a sample week next to the real-world cases Duezy handles. */
export default function DuezyAuthShowcase() {
  return (
    <section className="dz-land-band">
      <div className="dz-land-handles">
        <span className="dz-eyebrow">See it in action</span>
        <h2>Handles the messy stuff</h2>
        <p className="dz-muted dz-small">The things that make a spreadsheet fall apart halfway through the season.</p>
        <ul className="dz-auth-handles">{HANDLES.map((h) => <li key={h}>{h}</li>)}</ul>
        <div className="dz-sport-strip dz-sport-strip--sm" aria-label="Works for any league: pool, darts, bowling, softball and more">
          <small>Works for any league:</small>
          {SPORTS.slice(0, 8).map((s) => <span key={s.value} title={s.label}>{s.icon}</span>)}
        </div>
      </div>
      <div className="dz-land-visual">
        <DuezyAuthPreview />
        <Link to={`${DUEZY_PATH}/demo`} className="dz-link dz-small dz-land-demo-link">Open the full demo league ›</Link>
      </div>
    </section>
  );
}
