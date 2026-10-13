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
import DuezyActivityPanel from './DuezyActivityPanel.jsx';
import DuezySectionTabs from './DuezySectionTabs.jsx';
import DuezyUndoToast from './DuezyUndoToast.jsx';
import DuezyGettingStarted from './DuezyGettingStarted.jsx';
import DuezySkeleton from './DuezySkeleton.jsx';
import DuezyNoAccess from './DuezyNoAccess.jsx';
import { roleLabel } from '../../utils/duezyPeople.js';

const SECTIONS = ['main', 'late', 'activity'];

export default function DuezyLeaguePage() {
  const { leagueId } = useParams();
  const [params, setParams] = useSearchParams();
  const data = useDuezyLeague(leagueId);
  const { league, units, several, teams, paymentIndex, error, setError, loading } = data;
  const [viewWeeks, setViewWeeks] = useState({});
  const [correctRequest, setCorrectRequest] = useState(null);

  const opts = useMemo(
    () => ({ today: todayISO(league?.timezone), defaultGrace: Number(league?.grace_days) || 0 }),
    [league?.timezone, league?.grace_days]
  );
  const all = useMemo(() => allDivisionsStats(units, teams, paymentIndex, opts), [units, teams, paymentIndex, opts]);

  if (loading) return <DuezySkeleton variant="league" label="Loading league…" />;
  if (!league) return <DuezyNoAccess detail={error && error !== 'League not found.' ? error : ''} />;

  const sport = sportOf(league.sport);
  const settingsTo = data.canEdit ? `${DUEZY_PATH}/league/${league.id}/settings` : null;
  const lastChange = data.payments.reduce((m, p) => (p.updated_at > m ? p.updated_at : m), '');
  const requested = params.get('div');
  const current = several ? all.per.find((s) => s.unit.id === requested) || null : all.per[0];
  const showAll = several && !current;
  const section = SECTIONS.includes(params.get('view')) ? params.get('view') : 'main';

  const updateParams = (changes) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    return next;
  }, { replace: true });
  const openDivision = (id) => updateParams({ div: id === ALL_DIVISIONS ? null : id });
  const showSection = (id) => updateParams({ view: id === 'main' ? null : id });
  const correctChange = (change) => {
    const team = teams.find((t) => t.id === change.teamId);
    updateParams({ view: null, ...(several && team?.division_id ? { div: team.division_id } : {}) });
    setCorrectRequest({ teamId: change.teamId, key: Date.now() });
    data.dismissLastChange();
  };

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

  const named = !showAll && Boolean(several || (selected.unit.id && selected.unit.name));
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
      title={named ? `Division: ${selected.unit.name}` : league.name}
      subtitle={named ? league.name : ''}
      centered={named}
      meta={[
        !several && sport.short,
        selected.unit.play_day && `${selected.unit.play_day}s`,
        `${money(selected.dues)} per team weekly`,
        `${selected.teams.length} teams`,
      ]}
      settingsTo={settingsTo}
      weekNav={weekNav}
    />
  );

  const sectionTabs = (mainLabel, lateCount) => (
    <DuezySectionTabs
      label="League sections"
      active={section}
      onChange={showSection}
      tabs={[
        { id: 'main', label: mainLabel },
        { id: 'late', label: 'Late', count: lateCount, tone: 'bad' },
        { id: 'activity', label: 'Activity' },
      ]}
    />
  );
  const activity = <DuezyActivityPanel league={league} units={units} refreshKey={lastChange} embedded />;

  return (
    <div className="dz-stack dz-stack--lg">
      <div className="dz-row">
        <Link to={DUEZY_PATH} className="dz-link dz-small">‹ All leagues</Link>
        <DuezyExportButton league={league} />
      </div>

      {several ? (
        <DuezyDivisionTabs divisions={units} active={showAll ? ALL_DIVISIONS : selected.unit.id} onChange={openDivision} behindCounts={behindCounts} />
      ) : null}

      {hero}

      {data.role && data.role !== 'owner' ? (
        <p className="dz-viewonly">
          <span aria-hidden="true">{data.canEdit ? '🤝' : '👀'}</span>
          <span>
            Shared with you as <strong>{roleLabel(data.role)}</strong>.{' '}
            {data.canEdit ? 'You can record payments and edit teams; the owner manages people and billing.' : 'You can see everything but not change it.'}
          </span>
        </p>
      ) : null}

      {error ? (
        <p className="dz-error" role="alert">
          {error}{' '}
          <button type="button" className="dz-link dz-small" onClick={() => setError('')}>Dismiss</button>
        </p>
      ) : null}

      {data.isOwner && data.canEdit ? (
        <DuezyGettingStarted league={league} teamCount={teams.length} settingsTo={settingsTo} />
      ) : null}

      {showAll ? (
        <DuezyAllDivisions
          league={league}
          all={all}
          onOpen={(id) => updateParams({ div: id, view: null })}
          section={section}
          tabs={sectionTabs('Divisions', all.behind.length)}
          activity={activity}
        />
      ) : (
        <DuezyUnitView
          key={selected.unit.id || 'single'}
          league={league}
          stats={selected}
          data={data}
          divisions={units}
          section={section}
          tabs={sectionTabs('Teams', selected.behind.length)}
          activity={activity}
          onShowLate={() => showSection('late')}
          correctRequest={correctRequest}
        />
      )}

      {data.isOwner && section === 'main' ? (
        <p className="dz-small dz-muted dz-center">
          Want help collecting? <Link to={`${settingsTo}?tab=people`} className="dz-link">Add a co-treasurer or viewer</Link>
        </p>
      ) : null}

      <DuezyUndoToast
        change={data.lastChange}
        teams={teams}
        onUndo={data.undoLastChange}
        onDismiss={data.dismissLastChange}
        onCorrect={data.canEdit ? correctChange : null}
      />
    </div>
  );
}
