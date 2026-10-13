import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSupportLeague } from '../../services/duezyAdminService.js';
import { indexPayments, money } from '../../utils/duezyMath.js';
import { allDivisionsStats, divisionUnits, teamBalance } from '../../utils/duezyDivisions.js';
import { todayISO } from '../../utils/duezySchedule.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezySeasonSummary from './DuezySeasonSummary.jsx';
import SeasonStrip from './DuezySeasonStrip.jsx';

function balanceText(b) {
  if (b.late > 0) return <span className="dz-owe-late">{money(b.late)} late{b.due > 0 ? ` · ${money(b.due)} due` : ''}</span>;
  if (b.due > 0) return <span className="dz-owe-due">{money(b.due)} due</span>;
  return <span className="dz-muted">caught up</span>;
}

/** Read-only support view of a customer's league. Nothing here can change their data. */
export default function DuezyAdminLeague() {
  const { leagueId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getSupportLeague(leagueId).then(setData).catch((e) => setError(e.message));
  }, [leagueId]);

  const view = useMemo(() => {
    if (!data) return null;
    const { league, divisions, teams, payments } = data;
    const paymentIndex = indexPayments(payments);
    const units = divisionUnits(league, divisions);
    const opts = { today: todayISO(league.timezone), defaultGrace: Number(league.grace_days) || 0 };
    return { paymentIndex, units, stats: allDivisionsStats(units, teams, paymentIndex, opts) };
  }, [data]);

  const back = data
    ? <Link to={`${DUEZY_PATH}/admin/account/${data.league.owner_id}`} className="dz-link dz-small">Back to account</Link>
    : <Link to={`${DUEZY_PATH}/admin`} className="dz-link dz-small">Back to all accounts</Link>;
  if (error) return <div className="dz-card dz-stack">{back}<p className="dz-error">{error}</p></div>;
  if (!view) return <p className="dz-muted dz-center">Loading…</p>;

  const { league } = data;
  const { stats, paymentIndex } = view;

  return (
    <div className="dz-stack dz-stack--lg">
      <div className="dz-admin-readonly" role="status">Read-only support view — nothing here can change this league.</div>
      <section className="dz-card dz-stack">
        {back}
        <h1 className="dz-h1">{league.name}</h1>
        <p className="dz-muted dz-small">
          {[league.archived && 'Archived', `${view.units.length} ${view.units.length === 1 ? 'division' : 'divisions'}`, `${data.teams.length} teams`, league.payment_note]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </section>

      <DuezySeasonSummary season={stats.season} behind={stats.behind} owed={stats.owed} divisionCount={view.units.length} />

      {stats.per.map((s) => (
        <section key={s.unit.id || 'single'} className="dz-panel dz-stack">
          <div className="dz-row">
            <h2 className="dz-h3">{s.unit.name}</h2>
            <span className="dz-small dz-muted">
              {s.schedule.started ? `Week ${s.schedule.currentWeek} of ${s.unit.total_weeks}` : 'Not started'}
              {s.schedule.dates ? ` · ${s.schedule.label(s.schedule.currentWeek)}` : ''} · {money(s.dues)}/week
            </span>
          </div>
          {s.teams.length ? (
            <ul className="dz-admin-teams">
              {s.teams.map((t) => (
                <li key={t.id}>
                  <span>
                    <strong>{t.name}</strong>
                    <small className="dz-muted">{[t.captain, t.contact].filter(Boolean).join(' · ') || 'No captain listed'}</small>
                  </span>
                  <span className="dz-small">{balanceText(teamBalance(t.id, s.schedule, s.dues, paymentIndex))}</span>
                  <SeasonStrip teamId={t.id} week={s.week} dues={s.dues} paymentIndex={paymentIndex} schedule={s.schedule} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="dz-muted dz-small">No teams.</p>
          )}
        </section>
      ))}
    </div>
  );
}
