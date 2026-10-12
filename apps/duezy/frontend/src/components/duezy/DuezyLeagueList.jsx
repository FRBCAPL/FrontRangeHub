import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { listLeagues } from '../../services/duezyService.js';
import { listDivisionsForLeagues } from '../../services/duezyDivisionService.js';
import { money, weeklyDues } from '../../utils/duezyMath.js';
import { DUEZY_PATH, sportOf } from '../../data/duezyOptions.js';

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
      <ul className="dz-league-list">
        {leagues.map((l) => {
          const sport = sportOf(l.sport);
          const divisions = divisionsByLeague[l.id] || [];
          const pct = Math.min(100, Math.round((l.current_week / l.total_weeks) * 100));
          return (
            <li key={l.id}>
              <Link to={`${DUEZY_PATH}/league/${l.id}`} className="dz-league-card">
                <span className="dz-league-icon" aria-hidden="true">{sport.icon}</span>
                {divisions.length ? (
                  <span className="dz-league-body">
                    <strong>{l.name}</strong>
                    <span className="dz-muted dz-small">{sport.short} · {divisions.length} divisions</span>
                    <span className="dz-league-divs">
                      {divisions.map((d) => <span key={d.id}>{d.name} · wk {d.current_week}</span>)}
                    </span>
                  </span>
                ) : (
                  <span className="dz-league-body">
                    <strong>{l.name}</strong>
                    <span className="dz-muted dz-small">
                      {[sport.short, l.play_day && `${l.play_day}s`, `${money(weeklyDues(l))}/team weekly`].filter(Boolean).join(' · ')}
                    </span>
                    <span className="dz-league-progress" aria-label={`Week ${l.current_week} of ${l.total_weeks}`}>
                      <span style={{ width: `${pct}%` }} />
                    </span>
                    <span className="dz-muted dz-small">Week {l.current_week} of {l.total_weeks}</span>
                  </span>
                )}
                <span className="dz-league-go" aria-hidden="true">›</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
