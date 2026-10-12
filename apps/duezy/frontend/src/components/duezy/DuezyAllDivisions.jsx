import React from 'react';
import { money } from '../../utils/duezyMath.js';
import DuezyWeekSummary from './DuezyWeekSummary.jsx';
import DuezyBehindPanel from './DuezyBehindPanel.jsx';

/** Combined view: every division at its own current week. */
export default function DuezyAllDivisions({ league, all, onOpen }) {
  const { per, summary, behind } = all;

  return (
    <>
      <DuezyWeekSummary
        summary={summary}
        behindCount={behind.length}
        totalOwed={behind.reduce((s, x) => s + x.owed, 0)}
        title="This week, all divisions"
      />

      <ul className="dz-div-cards">
        {per.map((s) => {
          const pct = s.summary.expected ? Math.min(100, Math.round((s.summary.collected / s.summary.expected) * 100)) : 100;
          return (
            <li key={s.unit.id}>
              <button type="button" className="dz-div-card" onClick={() => onOpen(s.unit.id)}>
                <span className="dz-div-card-head">
                  <strong>{s.unit.name}</strong>
                  <span className="dz-muted dz-small">
                    {[s.unit.play_day && `${s.unit.play_day}s`, `Week ${s.week} of ${s.unit.total_weeks}`, `${s.teams.length} teams`].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="dz-league-progress" aria-label={`${pct}% collected this week`}>
                  <span style={{ width: `${pct}%` }} />
                </span>
                <span className="dz-div-card-foot">
                  <span>{money(s.summary.collected)} <small className="dz-muted">of {money(s.summary.expected)}</small></span>
                  {s.behind.length ? (
                    <span className="dz-div-card-owe">{s.behind.length} behind</span>
                  ) : (
                    <span className="dz-div-card-ok">All caught up</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <DuezyBehindPanel league={league} week={null} behind={behind} />
    </>
  );
}
