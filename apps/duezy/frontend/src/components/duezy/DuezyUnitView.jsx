import React, { useMemo, useState } from 'react';
import { graceLabel } from '../../utils/duezySchedule.js';
import { weekMethodTotals } from '../../utils/duezyMethodTotals.js';
import { playersWith } from '../../utils/duezyPayers.js';
import DuezyWeekSummary from './DuezyWeekSummary.jsx';
import DuezyWeekNav from './DuezyWeekNav.jsx';
import DuezyBehindPanel from './DuezyBehindPanel.jsx';
import DuezyPrepayPanel from './DuezyPrepayPanel.jsx';
import DuezyCatchUp from './DuezyCatchUp.jsx';
import DuezyTeamsPanel from './DuezyTeamsPanel.jsx';
import DuezyMakeupModal from './DuezyMakeupModal.jsx';
import DuezyGettingStarted from './DuezyGettingStarted.jsx';

/**
 * One division (or a single-division league) at its current week.
 * section: 'main' (teams) | 'late' | 'prepay' | 'activity'; `tabs` is the tab bar, `activity` the league-wide log.
 * Editors get the make-ups popup; viewers jump to the Make up filter instead.
 */
export default function DuezyUnitView({
  league, stats, data, divisions, section = 'main', tabs = null, activity = null,
  onShowLate, onShowMakeups, onShowPrepay, onOpenTeam,
  correctRequest = null, filterRequest = null, settingsTo = null, weekNav = null,
}) {
  const { week, schedule, summary, behind } = stats;
  const [makeupsOpen, setMakeupsOpen] = useState(false);
  const cash = useMemo(
    () => weekMethodTotals(stats.teams, week, stats.dues, data.paymentIndex),
    [stats.teams, week, stats.dues, data.paymentIndex]
  );
  const isCurrent = week === schedule.currentWeek;
  const weekName = schedule.dates ? schedule.label(week) : `week ${week}`;
  const title = isCurrent ? 'Collected this week' : `Collected for ${weekName}`;
  const cashTitle = isCurrent ? 'This week by method' : `${weekName} by method`;
  const graceNote = schedule.dates
    ? `Dues are due by ${graceLabel(schedule.grace).toLowerCase()}, late after that.`
    : 'Dues count as late once the next week starts.';

  const addPlayer = (team, name) => {
    const players = 'players' in team ? playersWith(team, name) : null;
    if (players) data.updateTeam(team.id, { players }).catch(() => {});
  };

  return (
    <>
      {data.canEdit ? <DuezyCatchUp leagueId={league.id} stats={stats} paymentIndex={data.paymentIndex} onMarkPaid={data.markPaidThrough} /> : null}

      <DuezyWeekSummary
        summary={summary}
        season={stats.season}
        title={title}
        cashTitle={cashTitle}
        owed={stats.owed}
        cash={cash}
        currentNote={graceNote}
        onShowLate={onShowLate}
        onShowMakeups={data.canEdit ? () => setMakeupsOpen(true) : onShowMakeups}
        onShowPrepay={onShowPrepay}
        tip={data.isOwner && data.canEdit ? (
          <DuezyGettingStarted league={league} teamCount={stats.teams.length} settingsTo={settingsTo} />
        ) : null}
        methodTeams={stats.teams}
        methodWeek={week}
        methodDues={stats.dues}
        methodIndex={data.paymentIndex}
        methodWeekLabel={isCurrent ? 'this week' : weekName}
      />

      {weekNav ? <DuezyWeekNav weekNav={weekNav} /> : null}
      {tabs}

      {section === 'main' ? <DuezyTeamsPanel league={league} stats={stats} data={data} divisions={divisions} correctRequest={correctRequest} filterRequest={filterRequest} /> : null}
      {section === 'late' ? (
        <DuezyBehindPanel league={league} behind={behind} graceNote={graceNote} onOpenTeam={onOpenTeam} />
      ) : null}
      {section === 'prepay' ? (
        <DuezyPrepayPanel prepays={stats.prepays || []} onOpenTeam={onOpenTeam} />
      ) : null}
      {section === 'activity' ? activity : null}

      {makeupsOpen ? (
        <DuezyMakeupModal
          league={league}
          stats={stats}
          paymentIndex={data.paymentIndex}
          onSetPayment={(teamId, w, entry) => data.setPayment(teamId, w, entry)}
          onAddPlayer={addPlayer}
          onOpenTeam={onOpenTeam ? (teamId, w) => { setMakeupsOpen(false); onOpenTeam(teamId, w); } : null}
          onClose={() => setMakeupsOpen(false)}
        />
      ) : null}
    </>
  );
}
