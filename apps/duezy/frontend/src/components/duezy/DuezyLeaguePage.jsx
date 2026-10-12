import React, { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import useDuezyLeague from '../../hooks/useDuezyLeague.js';
import { money } from '../../utils/duezyMath.js';
import { allDivisionsStats } from '../../utils/duezyDivisions.js';
import { DUEZY_PATH, sportOf } from '../../data/duezyOptions.js';
import DuezyLeagueHero from './DuezyLeagueHero.jsx';
import DuezyDivisionTabs, { ALL_DIVISIONS } from './DuezyDivisionTabs.jsx';
import DuezyUnitView from './DuezyUnitView.jsx';
import DuezyAllDivisions from './DuezyAllDivisions.jsx';

export default function DuezyLeaguePage() {
  const { leagueId } = useParams();
  const [params, setParams] = useSearchParams();
  const data = useDuezyLeague(leagueId);
  const { league, units, multi, teams, paymentIndex, error, setError, loading } = data;

  const all = useMemo(() => allDivisionsStats(units, teams, paymentIndex), [units, teams, paymentIndex]);

  if (loading) return <p className="dz-muted dz-center">Loading…</p>;
  if (!league) return <p className="dz-error">{error || 'League not found.'}</p>;

  const sport = sportOf(league.sport);
  const settingsTo = `${DUEZY_PATH}/league/${league.id}/settings`;
  const requested = params.get('div');
  const selected = multi ? all.per.find((s) => s.unit.id === requested) || null : all.per[0];
  const showAll = multi && !selected;
  const openDivision = (id) => setParams(id === ALL_DIVISIONS ? {} : { div: id }, { replace: true });

  const behindCounts = Object.fromEntries(all.per.map((s) => [s.unit.id, s.behind.length]));

  const hero = showAll ? (
    <DuezyLeagueHero
      icon={sport.icon}
      title={league.name}
      meta={[sport.short, `${units.length} divisions`, `${teams.length} teams`]}
      settingsTo={settingsTo}
    />
  ) : (
    <DuezyLeagueHero
      icon={sport.icon}
      title={multi ? selected.unit.name : league.name}
      subtitle={multi ? league.name : ''}
      meta={[
        !multi && sport.short,
        selected.unit.play_day && `${selected.unit.play_day}s`,
        `${money(selected.dues)} per team weekly`,
        `${selected.teams.length} teams`,
      ]}
      settingsTo={settingsTo}
      weekNav={{ week: selected.week, total: selected.unit.total_weeks, onChange: (w) => data.setWeek(selected.unit.id, w) }}
    />
  );

  return (
    <div className="dz-stack dz-stack--lg">
      <Link to={DUEZY_PATH} className="dz-link dz-small">‹ All leagues</Link>

      {multi ? (
        <DuezyDivisionTabs divisions={units} active={showAll ? ALL_DIVISIONS : selected.unit.id} onChange={openDivision} behindCounts={behindCounts} />
      ) : null}

      {hero}

      {error ? (
        <p className="dz-error" onClick={() => setError('')}>{error}</p>
      ) : null}

      {showAll ? (
        <DuezyAllDivisions league={league} all={all} onOpen={openDivision} />
      ) : (
        <DuezyUnitView key={selected.unit.id || 'single'} league={league} stats={selected} data={data} divisions={multi ? units : []} />
      )}
    </div>
  );
}
