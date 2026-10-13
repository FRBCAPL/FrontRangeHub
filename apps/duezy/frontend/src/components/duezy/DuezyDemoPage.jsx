import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useDuezyDemoLeague from '../../hooks/useDuezyDemoLeague.js';
import { DuezyDemoContext } from '../../hooks/useDuezyDemo.js';
import { DEMO_EMAIL } from '../../data/duezyDemoData.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezyLeagueView from './DuezyLeagueView.jsx';

/** /duezy/demo — the real league screens on a sample league, no account needed. Nothing is saved. */
export default function DuezyDemoPage() {
  const data = useDuezyDemoLeague();
  const demo = useMemo(() => ({ history: data.history, me: DEMO_EMAIL }), [data.history]);

  return (
    <DuezyDemoContext.Provider value={demo}>
      <div className="dz-stack dz-stack--lg">
        <aside className="dz-demo-banner" role="note">
          <div>
            <strong>You’re trying a demo league.</strong>
            <span> Tap teams to record payments, open the Late and Activity tabs, try a make-up. Nothing is saved — refresh to start over.</span>
          </div>
          <div className="dz-demo-banner-actions">
            <Link to={DUEZY_PATH} className="dz-link dz-small">‹ Back</Link>
            <Link to={`${DUEZY_PATH}?auth=signup`} className="dz-btn dz-btn--primary dz-btn--sm">Start free</Link>
          </div>
        </aside>
        <DuezyLeagueView data={data} demo />
      </div>
    </DuezyDemoContext.Provider>
  );
}
