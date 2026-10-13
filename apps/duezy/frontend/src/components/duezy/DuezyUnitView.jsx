import React from 'react';
import { graceLabel } from '../../utils/duezySchedule.js';
import DuezyWeekSummary from './DuezyWeekSummary.jsx';
import DuezyBehindPanel from './DuezyBehindPanel.jsx';
import DuezyCatchUp from './DuezyCatchUp.jsx';
import DuezyTeamsPanel from './DuezyTeamsPanel.jsx';

/**
 * One division (or a single-division league) at its current week.
 * section: 'main' (teams) | 'late' | 'activity'; `tabs` is the tab bar, `activity` the league-wide log.
 */
export default function DuezyUnitView({ league, stats, data, divisions, section = 'main', tabs = null, activity = null, onShowLate }) {
  const { week, schedule, summary, behind, dueTotal } = stats;
  const isCurrent = week === schedule.currentWeek;
  const title = isCurrent ? 'Collected this week' : `Collected for ${schedule.dates ? schedule.label(week) : `week ${week}`}`;
  const graceNote = schedule.dates
    ? `Dues are due by ${graceLabel(schedule.grace).toLowerCase()}, late after that.`
    : 'Dues count as late once the next week starts.';

  return (
    <>
      {data.canEdit ? <DuezyCatchUp leagueId={league.id} stats={stats} paymentIndex={data.paymentIndex} onMarkPaid={data.markPaidThrough} /> : null}

      <DuezyWeekSummary
        summary={summary}
        title={title}
        lateCount={behind.length}
        lateTotal={behind.reduce((s, x) => s + x.owed, 0)}
        dueTotal={dueTotal}
        onShowLate={onShowLate}
      />

      {tabs}

      {section === 'main' ? <DuezyTeamsPanel league={league} stats={stats} data={data} divisions={divisions} /> : null}
      {section === 'late' ? <DuezyBehindPanel league={league} behind={behind} graceNote={graceNote} /> : null}
      {section === 'activity' ? activity : null}
    </>
  );
}
