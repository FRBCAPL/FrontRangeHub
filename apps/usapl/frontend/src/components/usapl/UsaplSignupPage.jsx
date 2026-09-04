import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import { useUsaplLocations } from '../../hooks/useUsaplLocations.js';
import { parseUsaplDivisionIds } from '../../data/usaplDivisionIds.js';
import { USAPL_SIGNUP_KINDS } from '../../data/usaplSignupSteps.js';
import UsaplSignupWizard from './UsaplSignupWizard.jsx';

export default function UsaplSignupPage() {
  const [params] = useSearchParams();
  const { divisions, loading } = useUsaplDivisions({ signupOnly: true });
  const { names: locationNames, loading: locationsLoading } = useUsaplLocations();
  const [done, setDone] = useState(null);
  const initialKind = USAPL_SIGNUP_KINDS.some((item) => item.id === params.get('kind'))
    ? params.get('kind')
    : 'full_team';

  if (done) {
    return (
      <div className="usapl-page usapl-signup-page">
        <div className="usapl-success">
          <h1>Signup received</h1>
          <p>Thanks. The league office will follow up. You can add or update a roster any time.</p>
          <div className="usapl-actions">
            <Link className="usapl-btn" to="/usapl/roster">Submit a roster</Link>
            <Link className="usapl-btn-secondary" to="/usapl">League home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="usapl-page usapl-signup-page">
      <UsaplSignupWizard
        divisions={divisions}
        divisionsLoading={loading}
        locationNames={locationNames}
        locationsLoading={locationsLoading}
        initialKind={initialKind}
        initialDivisionIds={parseUsaplDivisionIds(params.get('division'))}
        onDone={setDone}
      />
    </div>
  );
}
