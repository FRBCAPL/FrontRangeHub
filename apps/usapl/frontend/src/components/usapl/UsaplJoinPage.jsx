import React, { useMemo } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import UsaplSignupPage from './UsaplSignupPage.jsx';
import UsaplRosterPage from './UsaplRosterPage.jsx';

function isRosterTab(params) {
  return params.get('tab') === 'roster';
}

function joinHref(params, tab) {
  const next = new URLSearchParams(params);
  if (tab === 'roster') next.set('tab', 'roster');
  else next.delete('tab');
  const qs = next.toString();
  return `/usapl/signup${qs ? `?${qs}` : ''}`;
}

export default function UsaplJoinPage() {
  const [params] = useSearchParams();
  const roster = isRosterTab(params);
  const signupHref = useMemo(() => joinHref(params, 'signup'), [params]);
  const rosterHref = useMemo(() => joinHref(params, 'roster'), [params]);

  return (
    <div className="usapl-join-page">
      <div className="usapl-join-tabs" role="tablist" aria-label="Sign up or roster">
        <Link
          role="tab"
          aria-selected={!roster}
          className={`usapl-join-tab${!roster ? ' is-active' : ''}`}
          to={signupHref}
          replace
        >
          Sign up
        </Link>
        <Link
          role="tab"
          aria-selected={roster}
          className={`usapl-join-tab${roster ? ' is-active' : ''}`}
          to={rosterHref}
          replace
        >
          Roster
        </Link>
      </div>
      {roster ? <UsaplRosterPage /> : <UsaplSignupPage />}
    </div>
  );
}

/** Keep old /usapl/roster links working. */
export function UsaplRosterRedirect() {
  const location = useLocation();
  const next = new URLSearchParams(location.search);
  next.set('tab', 'roster');
  const qs = next.toString();
  return <Navigate to={`/usapl/signup${qs ? `?${qs}` : ''}`} replace />;
}
