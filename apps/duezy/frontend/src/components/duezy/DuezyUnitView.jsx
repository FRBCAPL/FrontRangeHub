import React, { useState } from 'react';
import DuezyWeekSummary from './DuezyWeekSummary.jsx';
import DuezyTeamRow from './DuezyTeamRow.jsx';
import DuezyBehindPanel from './DuezyBehindPanel.jsx';
import DuezyAddTeam from './DuezyAddTeam.jsx';

/** One division (or a single-division league) at its current week. */
export default function DuezyUnitView({ league, stats, data, divisions }) {
  const [openTeamId, setOpenTeamId] = useState('');
  const { unit, teams, week, dues, summary, behind } = stats;

  return (
    <>
      <DuezyWeekSummary summary={summary} behindCount={behind.length} totalOwed={behind.reduce((s, x) => s + x.owed, 0)} />

      <section className="dz-panel">
        <div className="dz-row dz-panel-head">
          <h3 className="dz-h3">{unit.id ? `${unit.name} teams` : 'Teams'}</h3>
          <span className="dz-muted dz-small">Tap a team for history and partial payments</span>
        </div>
        {teams.length ? (
          <ul className="dz-team-list">
            {teams.map((team) => (
              <DuezyTeamRow
                key={team.id}
                team={team}
                week={week}
                dues={dues}
                paymentIndex={data.paymentIndex}
                divisions={divisions}
                open={openTeamId === team.id}
                onToggle={() => setOpenTeamId(openTeamId === team.id ? '' : team.id)}
                onSetPayment={(entry) => data.setPayment(team.id, week, entry)}
                onUpdateTeam={(changes) => data.updateTeam(team.id, changes)}
              />
            ))}
          </ul>
        ) : (
          <p className="dz-muted dz-small">No teams yet — add the first one below.</p>
        )}
        <DuezyAddTeam onAdd={(team) => data.addTeam(team, unit.id)} />
      </section>

      <DuezyBehindPanel league={league} week={week} behind={behind} />
    </>
  );
}
