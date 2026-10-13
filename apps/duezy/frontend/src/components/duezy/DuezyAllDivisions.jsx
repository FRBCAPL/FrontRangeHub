import React from 'react';
import { money } from '../../utils/duezyMath.js';
import DuezySeasonSummary from './DuezySeasonSummary.jsx';
import DuezyBehindPanel from './DuezyBehindPanel.jsx';

function DivisionCards({ per, onOpen }) {
  return (
    <ul className="dz-div-cards">
      {per.map((s) => {
        const pct = s.summary.expected ? Math.min(100, Math.round((s.summary.collected / s.summary.expected) * 100)) : 100;
        return (
          <li key={s.unit.id}>
            <button type="button" className="dz-div-card" onClick={() => onOpen(s.unit.id)}>
              <span className="dz-div-card-head">
                <span className="dz-row">
                  <strong>{s.unit.name}</strong>
                  <span className="dz-week-badge">
                    {s.schedule.dates && !s.schedule.started
                      ? `Starts ${s.schedule.label(1)}`
                      : `Week ${s.week}/${s.unit.total_weeks}${s.schedule.dates ? ` · ${s.schedule.label(s.week)}` : ''}`}
                  </span>
                </span>
                <span className="dz-muted dz-small">
                  {[s.unit.play_day && `${s.unit.play_day}s`, `${s.teams.length} teams`].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="dz-league-progress" aria-label={`${pct}% collected for week ${s.week}`}>
                <span style={{ width: `${pct}%` }} />
              </span>
              <span className="dz-div-card-foot">
                <span>
                  {money(s.summary.collected)} <small className="dz-muted">of {money(s.summary.expected)} · week {s.week}</small>
                </span>
                {s.behind.length ? (
                  <span className="dz-div-card-owe">{s.behind.length} late · {money(s.behind.reduce((t, x) => t + x.owed, 0))}</span>
                ) : (
                  <span className="dz-div-card-ok">✓ All caught up</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Combined view: every division at its own current week. section: 'main' | 'late' | 'activity'. */
export default function DuezyAllDivisions({ league, all, onOpen, section = 'main', tabs = null, activity = null }) {
  const { per, season, behind, dueTotal } = all;

  return (
    <>
      <DuezySeasonSummary season={season} behind={behind} dueTotal={dueTotal} divisionCount={per.length} />
      {tabs}
      {section === 'main' ? <DivisionCards per={per} onOpen={onOpen} /> : null}
      {section === 'late' ? <DuezyBehindPanel league={league} behind={behind} graceNote="Each division uses its own dates and grace period." /> : null}
      {section === 'activity' ? activity : null}
    </>
  );
}
