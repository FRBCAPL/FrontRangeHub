import React from 'react';
import { centsToDollars, incomeSplitChipLabel, incomeSplitOptionKey } from '../../data/usaplIncomeProjection.js';
import { weeklyTeamDuesCents } from '../../data/usaplIncomeTeamSize.js';
import UsaplIncomeStepper from './UsaplIncomeStepper.jsx';
import UsaplAdminIncomeWeekSpan from './UsaplAdminIncomeWeekSpan.jsx';

export default function UsaplAdminIncomeForm({
  teams,
  playersPerTeam,
  weeks,
  dues,
  playType,
  splitOptions,
  onTeams,
  onWeeks,
  onPickSaved,
  onOpenSetup,
}) {
  const teamDuesCents = weeklyTeamDuesCents(Math.round(Number(dues) * 100), playersPerTeam, playType);
  const teamCount = Math.max(0, Number.parseInt(teams, 10) || 0);
  const nightDuesCents = teamDuesCents * teamCount;
  const selectedKey = incomeSplitOptionKey(
    Math.round(Number(dues) * 100),
    playType,
    playersPerTeam,
  );
  return (
    <section className="usapl-income-calc">
      <h2>Division size</h2>
      <div className="usapl-income-calc-size">
        <UsaplIncomeStepper id="usapl-income-teams" label="Teams" value={teams} min={1} max={32} onChange={onTeams} />
        <UsaplAdminIncomeWeekSpan weeks={weeks} onWeeks={onWeeks} />
      </div>
      {splitOptions?.length ? (
        <div className="usapl-field">
          <span>Chart</span>
          <div className="usapl-choice-row">
            {splitOptions.map((row) => {
              const key = incomeSplitOptionKey(row.dues_cents, row.play_type, row.players);
              return (
                <button
                  key={key}
                  type="button"
                  className={`usapl-choice${key === selectedKey ? ' selected' : ''}`}
                  onClick={() => onPickSaved(row)}
                >
                  {incomeSplitChipLabel(row)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="usapl-income-calc-meta">
        {teamDuesCents ? (
          <p className="usapl-note">
            {teamCount || '—'} teams × {centsToDollars(teamDuesCents)}
            {playType === 'double' ? ' (2 matches)' : ''}
            {' '}={centsToDollars(nightDuesCents)} dues tonight.
          </p>
        ) : null}
        <button type="button" className="usapl-text-btn" onClick={onOpenSetup}>
          {splitOptions?.length ? 'Edit private chart' : 'Add private chart'}
        </button>
      </div>
    </section>
  );
}
