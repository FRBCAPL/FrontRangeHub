import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { listLeagues } from '../../services/duezyService.js';
import { listDivisionsForLeagues } from '../../services/duezyDivisionService.js';
import { money, weeklyDues } from '../../utils/duezyMath.js';
import { divisionUnits, unitSchedule } from '../../utils/duezyDivisions.js';
import { todayISO } from '../../utils/duezySchedule.js';
import { DUEZY_PATH, sportOf } from '../../data/duezyOptions.js';

/** One division line inside a league card: name, night, dues and how far into its season. */
function DivisionLine({ unit, today }) {
  const week = unitSchedule(unit, { today }).currentWeek;
  const total = Math.max(1, Number(unit.total_weeks) || 1);
  const pct = Math.min(100, Math.round((week / total) * 100));
  return (
    <li className="dz-league-div">
      <span className="dz-league-div-name">{unit.id ? unit.name : 'Division'}</span>
      <span className="dz-muted dz-small">
        {[unit.play_day && `${unit.play_day}s`, `${money(weeklyDues(unit))}/team weekly`, `week ${week} of ${total}`].filter(Boolean).join(' · ')}
      </span>
      <span className="dz-league-progress" aria-label={`Week ${week} of ${total}`}>
        <span style={{ width: `${pct}%` }} />
      </span>
    </li>
  );
}

export default function DuezyLeagueList() {
  const [leagues, setLeagues] = useState(null);
  const [error, setError] = useState('');

  const [divisionsByLeague, setDivisionsByLeague] = useState({});

  useEffect(() => {
    listLeagues()
      .then(async (list) => {
        setLeagues(list);
        const multiIds = list.filter((l) => l.multi_division).map((l) => l.id);
        const divisions = await listDivisionsForLeagues(multiIds);
        const grouped = {};
        divisions.forEach((d) => { (grouped[d.league_id] ||= []).push(d); });
        setDivisionsByLeague(grouped);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="dz-error">{error}</p>;
  if (!leagues) return <p className="dz-muted dz-center">Loading your leagues…</p>;
  if (!leagues.length) return <Navigate to={`${DUEZY_PATH}/new`} replace />;

  return (
    <div className="dz-stack dz-stack--lg">
      <div className="dz-row">
        <div>
          <span className="dz-eyebrow">Dashboard</span>
          <h1 className="dz-h1">Your leagues</h1>
        </div>
        <Link to={`${DUEZY_PATH}/new`} className="dz-btn dz-btn--primary">+ New league</Link>
      </div>
      <p className="dz-small dz-muted">
        A league is your whole organization; divisions are the groups of teams inside it. To add another night,
        skill level or format, use <strong>+ Add division</strong> under the league. <strong>+ New league</strong> starts a separate organization.
      </p>
      <ul className="dz-league-list">
        {leagues.map((l) => {
          const sport = sportOf(l.sport);
          const units = divisionUnits(l, divisionsByLeague[l.id] || []);
          const today = todayISO(l.timezone);
          return (
            <li key={l.id}>
              <Link to={`${DUEZY_PATH}/league/${l.id}`} className="dz-league-card">
                <span className="dz-league-icon" aria-hidden="true">{sport.icon}</span>
                <span className="dz-league-body">
                  <span className="dz-eyebrow">League</span>
                  <strong>{l.name}</strong>
                  <span className="dz-muted dz-small">
                    {sport.short} · {units.length} {units.length === 1 ? 'division' : 'divisions'}
                  </span>
                  <ul className="dz-league-divs">
                    {units.map((u) => <DivisionLine key={u.id || 'legacy'} unit={u} today={today} />)}
                  </ul>
                </span>
                <span className="dz-league-go" aria-hidden="true">›</span>
              </Link>
              <Link to={`${DUEZY_PATH}/league/${l.id}/settings?add=division`} className="dz-link dz-small dz-league-add-div">
                + Add division to {l.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
