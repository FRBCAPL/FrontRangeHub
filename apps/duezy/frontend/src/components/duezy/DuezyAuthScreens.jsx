import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import teamsShot from '../../assets/duezy-shot-teams.jpg';
import lateShot from '../../assets/duezy-shot-late.jpg';
import summaryShot from '../../assets/duezy-shot-summary.jpg';

const SCREENS = [
  {
    id: 'teams',
    tab: 'Record payments',
    img: teamsShot,
    alt: 'Team list with Cash, Venmo, Cash App, Zelle, PayPal, Card, Check, Other, Bye and Make up buttons next to each team',
    caption: 'Every team on one screen. Tap how they paid — late balances and make-ups show right on the row.',
  },
  {
    id: 'late',
    tab: 'See who’s late',
    img: lateShot,
    alt: 'Late teams with amounts owed and a ready-to-copy group chat reminder',
    caption: 'Who owes and for which weeks, plus a reminder you can copy into the group chat or text a captain.',
  },
  {
    id: 'totals',
    tab: 'Know the totals',
    img: summaryShot,
    alt: 'Weekly totals: collected this week, cash versus other methods, and what is still to collect',
    caption: 'Collected this week and this season, cash versus every other method, and what’s still out.',
  },
];

/** Landing "A look inside": real screenshots from the demo league, one at a time. */
export default function DuezyAuthScreens() {
  const [active, setActive] = useState(SCREENS[0].id);
  const screen = SCREENS.find((s) => s.id === active);

  return (
    <section className="dz-land-screens" aria-labelledby="dz-screens-title">
      <div className="dz-land-screens-head">
        <span className="dz-eyebrow">A look inside</span>
        <h2 id="dz-screens-title">The real app, not a mockup</h2>
      </div>
      <div className="dz-land-screens-tabs" role="tablist" aria-label="App screens">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === active}
            className={`dz-land-screens-tab${s.id === active ? ' is-active' : ''}`}
            onClick={() => setActive(s.id)}
          >
            {s.tab}
          </button>
        ))}
      </div>
      <figure className="dz-land-shot" role="tabpanel">
        <div className="dz-land-shot-frame">
          <span className="dz-land-shot-bar" aria-hidden="true"><i /><i /><i /></span>
          <img src={screen.img} alt={screen.alt} loading="lazy" />
        </div>
        <figcaption>
          {screen.caption}{' '}
          <Link to={`${DUEZY_PATH}/demo`} className="dz-link">Try it in the demo ›</Link>
        </figcaption>
      </figure>
    </section>
  );
}
