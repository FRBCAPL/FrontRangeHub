import React from 'react';
import { Link } from 'react-router-dom';
import { roleLabel } from '../../utils/duezyPeople.js';
import { money, weeklyDues } from '../../utils/duezyMath.js';
import { divisionUnits, unitSchedule } from '../../utils/duezyDivisions.js';
import { todayISO } from '../../utils/duezySchedule.js';
import { DUEZY_PATH, sportOf } from '../../data/duezyOptions.js';

/** One division line inside a league card: name, night, dues and how far into its season. */
function DivisionLine({ unit, today }) {
  const schedule = unitSchedule(unit, { today });
  const week = schedule.currentWeek;
  const total = Math.max(1, Number(unit.total_weeks) || 1);
  const pct = schedule.started ? Math.min(100, Math.round((week / total) * 100)) : 0;
  const when = schedule.started ? `week ${week} of ${total}` : `starts ${schedule.label(1)}`;
  return (
    <li className="dz-league-div">
      <span className="dz-league-div-name">{unit.id ? unit.name : 'Division'}</span>
      <span className="dz-muted dz-small">
        {[unit.play_day && `${unit.play_day}s`, `${money(weeklyDues(unit))}/team weekly`, when].filter(Boolean).join(' · ')}
      </span>
      <span className="dz-league-progress" aria-label={schedule.started ? `Week ${week} of ${total}` : 'Not started yet'}>
        <span style={{ width: `${pct}%` }} />
      </span>
    </li>
  );
}

/** "$105 collected · 2 late $40" — snapshot is null while it loads, undefined if it couldn't load. */
function MoneyLine({ snapshot }) {
  if (snapshot === undefined) return null;
  if (!snapshot) return <span className="dz-league-money dz-sk dz-sk-line" aria-hidden="true" />;
  const { collected, late, lateTeams, due } = snapshot;
  return (
    <span className="dz-league-money">
      <span className="is-collected">{money(collected)} collected</span>
      {lateTeams ? (
        <span className="is-late">{lateTeams} late · {money(late)}</span>
      ) : (
        <span className="is-ok">✓ Nobody late</span>
      )}
      {due > 0 ? <span className="dz-muted">{money(due)} due this week</span> : null}
    </span>
  );
}

export default function DuezyLeagueCard({ league, divisions, snapshot, sharedRole }) {
  const sport = sportOf(league.sport);
  const units = divisionUnits(league, divisions);
  const today = todayISO(league.timezone);

  return (
    <li>
      <Link to={`${DUEZY_PATH}/league/${league.id}`} className="dz-league-card">
        <span className="dz-league-icon" aria-hidden="true">{sport.icon}</span>
        <span className="dz-league-body">
          <span className="dz-eyebrow">League</span>
          <strong>
            {league.name}
            {sharedRole ? <span className="dz-shared-badge">Shared · {roleLabel(sharedRole)}</span> : null}
          </strong>
          <span className="dz-muted dz-small">
            {sport.short} · {units.length} {units.length === 1 ? 'division' : 'divisions'}
          </span>
          <MoneyLine snapshot={snapshot} />
          <ul className="dz-league-divs">
            {units.map((u) => <DivisionLine key={u.id || 'legacy'} unit={u} today={today} />)}
          </ul>
        </span>
        <span className="dz-league-go" aria-hidden="true">›</span>
      </Link>
      {sharedRole ? null : (
        <Link to={`${DUEZY_PATH}/league/${league.id}/settings?add=division`} className="dz-link dz-small dz-league-add-div">
          + Add division to {league.name}
        </Link>
      )}
    </li>
  );
}
