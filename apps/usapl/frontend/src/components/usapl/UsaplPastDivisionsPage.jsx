import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { groupUsaplPastDivisions } from '../../data/usaplPastDivisions.js';
import { useUsaplVegasSeedStats } from '../../hooks/useUsaplVegasSeedStats.js';
import UsaplPastDivisionCard from './UsaplPastDivisionCard.jsx';
import UsaplVegasWinnerTicker from './UsaplVegasWinnerTicker.jsx';

export default function UsaplPastDivisionsPage() {
  const { allDivisions, loading, stats } = useUsaplVegasSeedStats();
  const [year, setYear] = useState('all');
  const groups = useMemo(() => groupUsaplPastDivisions(allDivisions), [allDivisions]);
  const visible = year === 'all' ? groups : groups.filter((group) => String(group.year) === year);
  const empty = !loading && !groups.length;

  return (
    <div className="usapl-page usapl-divisions-page">
      <h1>Past divisions</h1>
      <p className="usapl-lede">
        Finished sessions and the teams that won them. Vegas Cup seeding is by division
        wins — the more you win, the higher you seed.
      </p>
      <UsaplVegasWinnerTicker />
      {groups.length > 1 ? (
        <div className="usapl-choice-row usapl-night-filters">
          <button
            type="button"
            className={`usapl-choice${year === 'all' ? ' selected' : ''}`}
            onClick={() => setYear('all')}
          >
            All years
          </button>
          {groups.map((group) => (
            <button
              type="button"
              key={group.label}
              className={`usapl-choice${year === String(group.year) ? ' selected' : ''}`}
              onClick={() => setYear(String(group.year))}
            >
              {group.label}
            </button>
          ))}
        </div>
      ) : null}
      {loading ? <p>Loading past nights…</p> : null}
      {empty ? (
        <p className="usapl-note">
          Past sessions will show here once a night is marked as a past division in admin, with
          the winner listed.
        </p>
      ) : null}
      {visible.map((group) => (
        <section className="usapl-night-section" key={group.label}>
          <h2 className="usapl-night-section-title">{group.label}</h2>
          <div className="usapl-night-grid">
            {group.divisions.map((division) => (
              <UsaplPastDivisionCard key={division.id} division={division} stats={stats} />
            ))}
          </div>
        </section>
      ))}
      <div className="usapl-actions">
        <Link className="usapl-btn-secondary" to="/usapl/divisions">Current nights</Link>
        <Link className="usapl-btn-secondary" to="/usapl/vegas-cup">Vegas Cup</Link>
      </div>
    </div>
  );
}
