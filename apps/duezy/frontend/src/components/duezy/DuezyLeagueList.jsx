import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { listLeagues, listTeamsAndPaymentsForLeagues } from '../../services/duezyService.js';
import { listDivisionsForLeagues } from '../../services/duezyDivisionService.js';
import { acceptInvites, myMemberships } from '../../services/duezyPeopleService.js';
import { getSession } from '../../services/duezyAuthService.js';
import { groupByLeague, leagueSnapshot } from '../../utils/duezyDashboard.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezyLeagueCard from './DuezyLeagueCard.jsx';
import DuezySkeleton from './DuezySkeleton.jsx';
import DuezyArchivedLeagues from './DuezyArchivedLeagues.jsx';
import { listArchivedLeagues } from '../../services/duezySeasonService.js';

export default function DuezyLeagueList() {
  const [leagues, setLeagues] = useState(null);
  const [archived, setArchived] = useState([]);
  const [error, setError] = useState('');
  const [divisionsByLeague, setDivisionsByLeague] = useState({});
  const [snapshots, setSnapshots] = useState({});
  const [sharedRoles, setSharedRoles] = useState({});
  const [joined, setJoined] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const added = await acceptInvites();
      const session = await getSession().catch(() => null);
      const [list, roles, old] = await Promise.all([
        listLeagues(), myMemberships(session?.user?.id), listArchivedLeagues().catch(() => []),
      ]);
      if (!alive) return;
      setJoined(added);
      setSharedRoles(roles);
      setArchived(old);
      setLeagues([...list].sort((a, b) => Number(Boolean(a.is_test)) - Number(Boolean(b.is_test))));

      const ids = list.map((l) => l.id);
      const multiIds = list.filter((l) => l.multi_division).map((l) => l.id);
      const divisions = groupByLeague(await listDivisionsForLeagues(multiIds));
      if (!alive) return;
      setDivisionsByLeague(divisions);

      const { teams, payments } = await listTeamsAndPaymentsForLeagues(ids).catch(() => ({ teams: null, payments: null }));
      if (!alive) return;
      if (!teams) {
        setSnapshots(false);
        return;
      }
      const teamsBy = groupByLeague(teams);
      const paymentsBy = groupByLeague(payments);
      setSnapshots(Object.fromEntries(list.map((l) => [l.id, leagueSnapshot(l, divisions[l.id] || [], teamsBy[l.id] || [], paymentsBy[l.id] || [])])));
    })().catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  if (error) return <p className="dz-error" role="alert">{error}</p>;
  if (!leagues) return <DuezySkeleton variant="list" label="Loading your leagues…" />;
  if (!leagues.length && !archived.length) return <Navigate to={`${DUEZY_PATH}/new`} replace />;
  const reload = () => window.location.reload();

  return (
    <div className="dz-stack dz-stack--lg">
      <div className="dz-page-head">
        <div className="dz-center">
          <span className="dz-eyebrow">Dashboard</span>
          <h1 className="dz-h1">Your leagues</h1>
        </div>
        <Link to={`${DUEZY_PATH}/new`} className="dz-btn dz-btn--primary">+ New league</Link>
      </div>
      <p className="dz-small dz-muted dz-center">
        You can have an unlimited number of leagues.<br />
        Each league must have at least one division and you can have unlimited divisions per league.<br />
        Add a division using <strong>+ Add division</strong> on the league page. <br />
        Same division starting over? Click <strong>Start next season</strong> on the league page or in the division’s settings.<br />
        A different league altogether? <strong>+ New league</strong>.
      </p>
      {leagues.some((l) => l.is_test) ? null : (
        <p className="dz-small dz-center">
          Want to practice first? <Link to={`${DUEZY_PATH}/new?test=1`} className="dz-link">Create a free test league</Link>
        </p>
      )}
      {joined ? (
        <p className="dz-notice" role="status">You were added to {joined === 1 ? 'a league' : `${joined} leagues`} — {joined === 1 ? 'it’s' : 'they’re'} below.</p>
      ) : null}
      <ul className="dz-league-list">
        {leagues.map((l) => (
          <DuezyLeagueCard
            key={l.id}
            league={l}
            divisions={divisionsByLeague[l.id] || []}
            snapshot={snapshots === false ? undefined : snapshots[l.id] || null}
            sharedRole={sharedRoles[l.id]}
          />
        ))}
      </ul>
      {!leagues.length ? <p className="dz-muted dz-center">Nothing running right now — restore an archived league below or start a new one.</p> : null}
      <DuezyArchivedLeagues leagues={archived} onRestored={reload} />
    </div>
  );
}
