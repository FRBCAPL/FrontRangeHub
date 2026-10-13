import React, { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import useDuezyLeague from '../../hooks/useDuezyLeague.js';
import { money } from '../../utils/duezyMath.js';
import { allDivisionsStats, unitStats } from '../../utils/duezyDivisions.js';
import { todayISO } from '../../utils/duezySchedule.js';
import { DUEZY_PATH, sportOf } from '../../data/duezyOptions.js';
import DuezyLeagueHero from './DuezyLeagueHero.jsx';
import DuezyDivisionTabs, { ALL_DIVISIONS } from './DuezyDivisionTabs.jsx';
import DuezyUnitView from './DuezyUnitView.jsx';
import DuezyAllDivisions from './DuezyAllDivisions.jsx';
import DuezyExportButton from './DuezyExportButton.jsx';

export default function DuezyLeaguePage() {
  const { leagueId } = useParams();
  const [params, setParams] = useSearchParams();
  const data = useDuezyLeague(leagueId);
  const { league, units, several, teams, paymentIndex, error, setError, loading } = data;
  const [viewWeeks, setViewWeeks] = useState({});

  const opts = useMemo(
    () => ({ today: todayISO(league?.timezone), defaultGrace: Number(league?.grace_days) || 0 }),
    [league?.timezone, league?.grace_days]
  );
  const all = useMemo(() => allDivisionsStats(units, teams, paymentIndex, opts), [units, teams, paymentIndex, opts]);

  if (loading) return <p className="dz-muted dz-center">Loading…</p>;
  if (!league) return <p className="dz-error">{error || 'League not found.'}</p>;

  const sport = sportOf(league.sport);
  const settingsTo = `${DUEZY_PATH}/league/${league.id}/settings`;
  const requested = params.get('div');
  const current = several ? all.per.find((s) => s.unit.id === requested) || null : all.per[0];
  const showAll = several && !current;
  const openDivision = (id) => setParams(id === ALL_DIVISIONS ? {} : { div: id }, { replace: true });

  const behindCounts = Object.fromEntries(all.per.map((s) => [s.unit.id, s.behind.length]));

  let selected = current;
  let weekNav = null;
  if (current) {
    const key = current.unit.id || 'single';
    const dated = Boolean(current.schedule.dates);
    const viewWeek = dated ? viewWeeks[key] : null;
    if (viewWeek && viewWeek !== current.week) {
      selected = unitStats(current.unit, teams, paymentIndex, all.per.indexOf(current) === 0, { ...opts, viewWeek });
    }
    weekNav = {
      week: selected.week,
      total: selected.unit.total_weeks,
      date: dated ? selected.schedule.label(selected.week) : '',
      currentWeek: current.schedule.currentWeek,
      started: current.schedule.started,
      startLabel: dated ? current.schedule.label(1) : '',
      onChange: dated
        ? (w) => setViewWeeks((prev) => ({ ...prev, [key]: w }))
        : (w) => data.setWeek(current.unit.id, w),
    };
  }

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
      title={several ? selected.unit.name : league.name}
      subtitle={several ? league.name : ''}
      meta={[
        !several && sport.short,
        !several && selected.unit.id && selected.unit.name,
        selected.unit.play_day && `${selected.unit.play_day}s`,
        `${money(selected.dues)} per team weekly`,
        `${selected.teams.length} teams`,
      ]}
      settingsTo={settingsTo}
      weekNav={weekNav}
    />
  );

  return (
    <div className="dz-stack dz-stack--lg">
      <div className="dz-row">
        <Link to={DUEZY_PATH} className="dz-link dz-small">‹ All leagues</Link>
        <DuezyExportButton league={league} units={units} teams={teams} payments={data.payments} />
      </div>

      {several ? (
        <DuezyDivisionTabs divisions={units} active={showAll ? ALL_DIVISIONS : selected.unit.id} onChange={openDivision} behindCounts={behindCounts} />
      ) : null}

      {hero}

      {error ? (
        <p className="dz-error" onClick={() => setError('')}>{error}</p>
      ) : null}

      {showAll ? (
        <DuezyAllDivisions league={league} all={all} onOpen={openDivision} />
      ) : (
        <DuezyUnitView key={selected.unit.id || 'single'} league={league} stats={selected} data={data} divisions={units} />
      )}
    </div>
  );
}
