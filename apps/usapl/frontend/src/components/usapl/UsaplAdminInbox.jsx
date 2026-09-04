import React, { useEffect, useState } from 'react';
import { listUsaplRosters, listUsaplSignups, updateUsaplRosterStatus, updateUsaplSignupStatus } from '../../services/usaplSubmissions.js';
import { usaplPreferredContactLabel } from '../../data/usaplContact.js';
import { usaplRosterModeLabel } from '../../data/usaplRosterSteps.js';
import { labelUsaplDivisions } from '../../data/usaplDivisionIds.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import UsaplAdminSubnav from './UsaplAdminSubnav.jsx';

function personName(player) {
  if (!player) return '';
  return [player.firstName, player.lastName].filter(Boolean).join(' ');
}

export default function UsaplAdminInbox() {
  const { divisions } = useUsaplDivisions();
  const [tab, setTab] = useState('signups');
  const [signups, setSignups] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
      <p className="usapl-lede">New signups and roster sheets. Contact details are operator-only.</p>
      <div className="usapl-choice-row" style={{ margin: '16px 0' }}>
        <button type="button" className={`usapl-choice ${tab === 'signups' ? 'selected' : ''}`} onClick={() => setTab('signups')}>
          Signups ({signups.length})
        </button>
        <button type="button" className={`usapl-choice ${tab === 'rosters' ? 'selected' : ''}`} onClick={() => setTab('rosters')}>
          Rosters ({rosters.length})
        </button>
      </div>
      {loading ? <p>Loading…</p> : null}
      {error ? <div className="usapl-error">{error}</div> : null}

      {tab === 'signups' ? signups.map((row) => (
        <section className="usapl-card" key={row.id} style={{ marginBottom: 12 }}>
          <h2>{row.team_name || personName(row.captain) || 'Signup'}</h2>
          <p>{row.kind} · {labelUsaplDivisions(row.division_id, divisions) || 'no division'} · {row.location}</p>
          <p className="usapl-meta">
            {personName(row.captain)}
            {row.kind === 'full_team' && row.captain?.isCaptain ? ' · Captain' : ''}
            {' · '}
            {row.captain?.email} · {row.captain?.phone}
            {row.captain?.preferredContact
              ? ` · Prefers ${usaplPreferredContactLabel(row.captain.preferredContact)}`
              : ''}
          </p>
          <p className="usapl-meta">{row.created_at ? new Date(row.created_at).toLocaleString() : ''}</p>
          <div className="usapl-field" style={{ maxWidth: 220, marginTop: 8 }}>
            <label>Status</label>
            <select
              value={row.status || 'new'}
              onChange={(e) => updateUsaplSignupStatus(row.id, e.target.value).then(load)}
            >
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="placed">Placed</option>
            </select>
          </div>
        </section>
      )) : null}

      {tab === 'rosters' ? rosters.map((row) => (
        <section className="usapl-card" key={row.id} style={{ marginBottom: 12 }}>
          <h2>{row.team_name}</h2>
          <p>{usaplRosterModeLabel(row.mode)} · {labelUsaplDivisions(row.division_id, divisions) || 'no division'}</p>
          <p>
            Captain: {personName(row.captain)} · {row.captain?.email} · {row.captain?.phone}
            {row.captain?.preferredContact
              ? ` · Prefers ${usaplPreferredContactLabel(row.captain.preferredContact)}`
              : ''}
          </p>
          <ul>
            {(row.players || []).map((player, index) => (
              <li key={`${row.id}-${index}`}>
                {personName(player)} {player.email ? `· ${player.email}` : ''} {player.phone ? `· ${player.phone}` : ''}
              </li>
            ))}
          </ul>
          <div className="usapl-field" style={{ maxWidth: 220, marginTop: 8 }}>
            <label>Status</label>
            <select
              value={row.status || 'new'}
              onChange={(e) => updateUsaplRosterStatus(row.id, e.target.value).then(load)}
            >
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="filed">Filed</option>
            </select>
          </div>
        </section>
      )) : null}

      {!loading && tab === 'signups' && !signups.length ? <p>No signups yet.</p> : null}
      {!loading && tab === 'rosters' && !rosters.length ? <p>No rosters yet.</p> : null}
    </div>
  );
}
