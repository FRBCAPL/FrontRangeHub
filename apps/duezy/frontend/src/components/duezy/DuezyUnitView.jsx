import React, { useState } from 'react';
import { graceLabel } from '../../utils/duezySchedule.js';
import DuezyWeekSummary from './DuezyWeekSummary.jsx';
import DuezyTeamRow from './DuezyTeamRow.jsx';
import DuezyBehindPanel from './DuezyBehindPanel.jsx';
import DuezyAddTeam from './DuezyAddTeam.jsx';
import DuezyCatchUp from './DuezyCatchUp.jsx';
import DuezyQuickMethod, { useQuickMethod } from './DuezyQuickMethod.jsx';

/** One division (or a single-division league) at its current week. */
export default function DuezyUnitView({ league, stats, data, divisions }) {
  const [openTeamId, setOpenTeamId] = useState('');
  const [quickMethod, setQuickMethod] = useQuickMethod(league.id);
  const { unit, teams, week, dues, schedule, summary, behind, dueTotal } = stats;
  const isCurrent = week === schedule.currentWeek;
  const title = isCurrent ? 'Collected this week' : `Collected for ${schedule.dates ? schedule.label(week) : `week ${week}`}`;
  const graceNote = schedule.dates
    ? `Dues are due by ${graceLabel(schedule.grace).toLowerCase()}, late after that.`
    : 'Dues count as late once the next week starts.';

  const { canEdit } = data;

  return (
    <>
      {canEdit ? <DuezyCatchUp leagueId={league.id} stats={stats} paymentIndex={data.paymentIndex} onMarkPaid={data.markPaidThrough} /> : null}

      <DuezyWeekSummary
        summary={summary}
        title={title}
        lateCount={behind.length}
        lateTotal={behind.reduce((s, x) => s + x.owed, 0)}
        dueTotal={dueTotal}
      />

      <section className="dz-panel">
        <div className="dz-row dz-panel-head">
          <h3 className="dz-h3">{divisions.length > 1 ? `${unit.name} teams` : 'Teams'}</h3>
          {canEdit ? <DuezyQuickMethod value={quickMethod} onChange={setQuickMethod} /> : null}
        </div>
        <p className="dz-muted dz-small dz-panel-hint">
          {canEdit ? 'Tap a team for history, partial payments and captain contact.' : 'Tap a team for its payment history and captain contact.'}
        </p>
        {teams.length ? (
          <ul className="dz-team-list">
            {teams.map((team) => (
              <DuezyTeamRow
                key={team.id}
                league={league}
                team={team}
                week={week}
                dues={dues}
                schedule={schedule}
                paymentIndex={data.paymentIndex}
                divisions={divisions}
                quickMethod={quickMethod}
                open={openTeamId === team.id}
                onToggle={() => setOpenTeamId(openTeamId === team.id ? '' : team.id)}
                onSetPayment={(entry) => data.setPayment(team.id, week, entry)}
                onUpdateTeam={(changes) => data.updateTeam(team.id, changes)}
                canEdit={canEdit}
              />
            ))}
          </ul>
        ) : (
          <p className="dz-muted dz-small">{canEdit ? 'No teams yet — add the first one below.' : 'No teams yet.'}</p>
        )}
        {canEdit ? <DuezyAddTeam onAdd={(team) => data.addTeam(team, unit.id)} /> : null}
      </section>

      <DuezyBehindPanel league={league} behind={behind} graceNote={graceNote} />
    </>
  );
}
