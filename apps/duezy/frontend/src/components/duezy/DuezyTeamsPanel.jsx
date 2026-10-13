import React, { useEffect, useState } from 'react';
import DuezyTeamRow from './DuezyTeamRow.jsx';
import DuezyAddTeam from './DuezyAddTeam.jsx';

/** The team list for one division's week: tap-to-record chips, expandable details, add team. */
export default function DuezyTeamsPanel({ league, stats, data, divisions, correctRequest = null }) {
  const [openTeamId, setOpenTeamId] = useState('');
  const [correcting, setCorrecting] = useState(null);
  const { unit, teams, week, dues, schedule } = stats;
  const { canEdit } = data;

  useEffect(() => {
    if (!correctRequest || !teams.some((t) => t.id === correctRequest.teamId)) return;
    setOpenTeamId(correctRequest.teamId);
    setCorrecting(correctRequest);
    requestAnimationFrame(() => {
      document.getElementById(`dz-team-${correctRequest.teamId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [correctRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="dz-panel">
      <div className="dz-row dz-panel-head">
        <h3 className="dz-h3">{divisions.length > 1 ? `${unit.name} teams` : 'Teams'}</h3>
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
              open={openTeamId === team.id}
              onToggle={() => {
                setOpenTeamId(openTeamId === team.id ? '' : team.id);
                setCorrecting(null);
              }}
              onSetPayment={(entry) => data.setPayment(team.id, week, entry)}
              onUpdateTeam={(changes) => data.updateTeam(team.id, changes)}
              canEdit={canEdit}
              correctKey={correcting?.teamId === team.id ? correcting.key : 0}
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
