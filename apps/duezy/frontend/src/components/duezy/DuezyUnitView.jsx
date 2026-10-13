import React, { useMemo } from 'react';
import { graceLabel } from '../../utils/duezySchedule.js';
import { weekMethodTotals } from '../../utils/duezyMethodTotals.js';
import DuezyWeekSummary from './DuezyWeekSummary.jsx';
import DuezyBehindPanel from './DuezyBehindPanel.jsx';
import DuezyCatchUp from './DuezyCatchUp.jsx';
import DuezyTeamsPanel from './DuezyTeamsPanel.jsx';
import DuezyDivisionSeason from './DuezyDivisionSeason.jsx';

/**
 * One division (or a single-division league) at its current week.
 * section: 'main' (teams) | 'late' | 'activity'; `tabs` is the tab bar, `activity` the league-wide log.
 */
export default function DuezyUnitView({
  league, stats, data, divisions, section = 'main', tabs = null, activity = null, onShowLate, onShowMakeups, onOpenTeam,
  correctRequest = null, filterRequest = null,
}) {
  const { week, schedule, summary, behind } = stats;
  const cash = useMemo(
    () => weekMethodTotals(stats.teams, week, stats.dues, data.paymentIndex),
    [stats.teams, week, stats.dues, data.paymentIndex]
  );
  const isCurrent = week === schedule.currentWeek;
  const weekName = schedule.dates ? schedule.label(week) : `week ${week}`;
  const title = isCurrent ? 'Collected this week' : `Collected for ${weekName}`;
  const cashTitle = isCurrent ? 'Cash collected this week' : `Cash collected for ${weekName}`;
  const graceNote = schedule.dates
    ? `Dues are due by ${graceLabel(schedule.grace).toLowerCase()}, late after that.`
    : 'Dues count as late once the next week starts.';

  return (
    <>
      {data.canEdit ? <DuezyCatchUp leagueId={league.id} stats={stats} paymentIndex={data.paymentIndex} onMarkPaid={data.markPaidThrough} /> : null}

      <DuezyWeekSummary
        summary={summary}
        title={title}
        cashTitle={cashTitle}
        owed={stats.owed}
        cash={cash}
        makeups={stats.makeups}
        currentNote={graceNote}
        onShowLate={onShowLate}
        onShowMakeups={onShowMakeups}
        onOpenTeam={onOpenTeam}
      />
      <DuezyDivisionSeason season={stats.season} />

      {tabs}

      {section === 'main' ? <DuezyTeamsPanel league={league} stats={stats} data={data} divisions={divisions} correctRequest={correctRequest} filterRequest={filterRequest} /> : null}
      {section === 'late' ? <DuezyBehindPanel league={league} behind={behind} graceNote={graceNote} /> : null}
      {section === 'activity' ? activity : null}
    </>
  );
}
