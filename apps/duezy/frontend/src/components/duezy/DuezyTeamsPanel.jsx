import React, { useState } from 'react';
import DuezyTeamRow from './DuezyTeamRow.jsx';
import DuezyAddTeam from './DuezyAddTeam.jsx';
import DuezyQuickMethod, { useQuickMethod } from './DuezyQuickMethod.jsx';

/** The team list for one division's week: tap-to-record chips, expandable details, add team. */
export default function DuezyTeamsPanel({ league, stats, data, divisions }) {
  const [openTeamId, setOpenTeamId] = useState('');
  const [quickMethod, setQuickMethod] = useQuickMethod(league.id);
  const { unit, teams, week, dues, schedule } = stats;
  const { canEdit } = data;

  return (
    <section className="dz-panel">
      <div className="dz-row dz-panel-head">
        <h3 className="dz-h3">{divisions.length > 1 ? `${unit.name} teams` : 'Teams'}</h3>
        {canEdit ? <DuezyQuickMethod value={quickMethod} onChange={setQuickMethod} /> : null}
      </div>
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
  );
}
