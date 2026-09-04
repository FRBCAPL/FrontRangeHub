import React, { useEffect, useState } from 'react';
import { listUsaplRosters, listUsaplSignups, updateUsaplSignupStatus } from '../../services/usaplSubmissions.js';
import { usaplPersonName, usaplPreferredContactLabel } from '../../data/usaplContact.js';
import { labelUsaplDivisions } from '../../data/usaplDivisionIds.js';
import { USAPL_SIGNUP_STATUS, usaplRosterSavedInDuezy } from '../../data/usaplInboxStatus.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import UsaplAdminCaptains from './UsaplAdminCaptains.jsx';
import UsaplAdminSubnav from './UsaplAdminSubnav.jsx';
import UsaplInboxRosterCard from './UsaplInboxRosterCard.jsx';
import UsaplInboxSavedRosters from './UsaplInboxSavedRosters.jsx';
import UsaplInboxStatus from './UsaplInboxStatus.jsx';

export default function UsaplAdminInbox() {
  const { divisions } = useUsaplDivisions();
  const [tab, setTab] = useState('signups');
  const [signups, setSignups] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pendingRosters = rosters.filter((row) => !usaplRosterSavedInDuezy(row.status));
  const savedRosters = rosters.filter((row) => usaplRosterSavedInDuezy(row.status));

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [signupRows, rosterRows] = await Promise.all([listUsaplSignups(), listUsaplRosters()]);
      setSignups(signupRows);
      setRosters(rosterRows);
    } catch (err) {
      setError(err?.message || 'Could not load submissions. Run the USAPL SQL migration in Supabase if the tables are missing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="usapl-page">
      <UsaplAdminSubnav />
      <h1>League inbox</h1>
      <p className="usapl-lede">New signups, roster sheets, and captain access requests. Contact details are operator-only.</p>
      <div className="usapl-choice-row" style={{ margin: '16px 0' }}>
        <button type="button" className={`usapl-choice ${tab === 'signups' ? 'selected' : ''}`} onClick={() => setTab('signups')}>
          Signups ({signups.length})
        </button>
        <button type="button" className={`usapl-choice ${tab === 'rosters' ? 'selected' : ''}`} onClick={() => setTab('rosters')}>
          Rosters ({pendingRosters.length})
        </button>
        <button type="button" className={`usapl-choice ${tab === 'saved' ? 'selected' : ''}`} onClick={() => setTab('saved')}>
          Saved in Duezy ({savedRosters.length})
        </button>
        <button type="button" className={`usapl-choice ${tab === 'captains' ? 'selected' : ''}`} onClick={() => setTab('captains')}>
          Captains
        </button>
      </div>
      {loading && tab !== 'captains' ? <p>Loading…</p> : null}
      {error ? <div className="usapl-error">{error}</div> : null}

      {tab === 'signups' ? signups.map((row) => (
        <section className="usapl-card" key={row.id} style={{ marginBottom: 12 }}>
          <h2>{row.team_name || usaplPersonName(row.captain) || 'Signup'}</h2>
          <p>{row.kind} · {labelUsaplDivisions(row.division_id, divisions) || 'no division'} · {row.location}</p>
          <p className="usapl-meta">
            {usaplPersonName(row.captain)}
            {row.kind === 'full_team' && row.captain?.isCaptain ? ' · Captain' : ''}
            {' · '}
            {row.captain?.email} · {row.captain?.phone}
            {row.captain?.preferredContact
              ? ` · Prefers ${usaplPreferredContactLabel(row.captain.preferredContact)}`
              : ''}
          </p>
          <p className="usapl-meta">{row.created_at ? new Date(row.created_at).toLocaleString() : ''}</p>
          <UsaplInboxStatus
            label="Your tracking"
            hint="For your inbox only. This does not change Duezy."
            value={row.status || 'new'}
            options={USAPL_SIGNUP_STATUS}
            onChange={(status) => updateUsaplSignupStatus(row.id, status).then(load)}
          />
        </section>
      )) : null}

      {tab === 'rosters' ? pendingRosters.map((row) => (
        <UsaplInboxRosterCard
          key={row.id}
          row={row}
          divisions={divisions}
          onReload={load}
        />
      )) : null}

      {tab === 'saved' ? (
        <UsaplInboxSavedRosters rows={savedRosters} divisions={divisions} />
      ) : null}

      {tab === 'captains' ? <UsaplAdminCaptains /> : null}

      {!loading && tab === 'signups' && !signups.length ? <p>No signups yet.</p> : null}
      {!loading && tab === 'rosters' && !pendingRosters.length ? <p>No roster edits waiting.</p> : null}
    </div>
  );
}
