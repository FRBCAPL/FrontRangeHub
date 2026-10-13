import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cancelInvite, getPeople, removePerson, setPersonRole } from '../../services/duezyPeopleService.js';
import { getSession } from '../../services/duezyAuthService.js';
import { ROLES, roleLabel } from '../../utils/duezyPeople.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezyInviteForm from './DuezyInviteForm.jsx';
import DuezyPermissionTable from './DuezyPermissionTable.jsx';

/** Who can see / work on this league. The owner invites, changes roles and removes; members can leave. */
export default function DuezyPeoplePanel({ league }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ref = useRef(null);
  const [people, setPeople] = useState(undefined);
  const [myId, setMyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getPeople(league.id).then(setPeople).catch((e) => { setPeople(null); setError(e.message); });
  }, [league.id]);

  useEffect(() => {
    load();
    getSession().then((s) => setMyId(s?.user?.id || '')).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (people && params.get('show') === 'people') ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [people, params]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (people === undefined) return null;
  if (people === null) {
    return (
      <section className="dz-card dz-stack" ref={ref}>
        <h2 className="dz-h3">People</h2>
        <p className="dz-small dz-muted">{error || 'Sharing a league needs a quick database update (duezy-members SQL).'}</p>
      </section>
    );
  }

  const owner = people.my_role === 'owner';
  const leave = () => {
    if (!window.confirm(`Leave ${league.name}? You'll lose access until the owner adds you again.`)) return;
    run(async () => {
      await removePerson(league.id, myId);
      navigate(DUEZY_PATH, { replace: true });
    });
  };

  return (
    <section className="dz-card dz-stack" ref={ref}>
      <div>
        <span className="dz-eyebrow">Sharing</span>
        <h2 className="dz-h3">People on this league</h2>
        <p className="dz-small dz-muted">
          Treasurers record payments and keep teams and divisions up to date. Viewers can see everything but change nothing.
        </p>
      </div>

      <details className="dz-perms-details">
        <summary className="dz-link dz-small">What can each role do?</summary>
        <DuezyPermissionTable />
      </details>

      <ul className="dz-people-list">
        <li>
          <span className="dz-people-who">
            <strong>{people.owner?.email || 'Owner'}</strong>
            {people.owner?.user_id === myId ? <small className="dz-muted">You</small> : null}
          </span>
          <span className="dz-people-role">Owner</span>
        </li>
        {people.members.map((m) => (
          <li key={m.user_id}>
            <span className="dz-people-who">
              <strong>{m.email || 'Member'}</strong>
              {m.user_id === myId ? <small className="dz-muted">You</small> : null}
            </span>
            {owner ? (
              <>
                <select value={m.role} onChange={(e) => run(() => setPersonRole(league.id, m.user_id, e.target.value))} aria-label={`Role for ${m.email}`}>
                  {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <button
                  type="button"
                  className="dz-link dz-link--danger dz-small"
                  onClick={() => window.confirm(`Remove ${m.email} from ${league.name}?`) && run(() => removePerson(league.id, m.user_id))}
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <span className="dz-people-role">{roleLabel(m.role)}</span>
                {m.user_id === myId ? <button type="button" className="dz-link dz-link--danger dz-small" onClick={leave}>Leave league</button> : null}
              </>
            )}
          </li>
        ))}
        {people.invites.map((i) => (
          <li key={i.email}>
            <span className="dz-people-who">
              <strong>{i.email}</strong>
              <small className="dz-muted">Invited — joins when they sign in to Duezy with this email</small>
            </span>
            <span className="dz-people-role is-pending">{roleLabel(i.role)} · pending</span>
            <button type="button" className="dz-link dz-link--danger dz-small" onClick={() => run(() => cancelInvite(league.id, i.email))}>Cancel</button>
          </li>
        ))}
      </ul>

      {error ? <p className="dz-error">{error}</p> : null}
      {owner ? <DuezyInviteForm league={league} onInvited={load} /> : null}
    </section>
  );
}
