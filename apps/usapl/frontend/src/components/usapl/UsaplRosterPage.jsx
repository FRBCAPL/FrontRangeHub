import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import UsaplRosterWizard from './UsaplRosterWizard.jsx';
import { usaplRosterInitialMode } from '../../data/usaplRosterSteps.js';

export default function UsaplRosterPage() {
  const [params] = useSearchParams();
  const [done, setDone] = useState(null);

  if (done) {
    return (
      <div className="usapl-page usapl-signup-page">
        <div className="usapl-success">
          <h1>Roster received</h1>
          <p>The league office will review this before the team list is updated. You can come back any time to add a player.</p>
          <div className="usapl-actions">
            <Link className="usapl-btn" to="/usapl/roster?mode=add" onClick={() => setDone(null)}>
              Add another player
            </Link>
            <Link className="usapl-btn-secondary" to="/usapl">League home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="usapl-page usapl-signup-page">
      <UsaplRosterWizard
        initialMode={usaplRosterInitialMode(params.get('mode'))}
        initialDivisionId={params.get('division') || ''}
        onDone={setDone}
      />
    </div>
  );
}
