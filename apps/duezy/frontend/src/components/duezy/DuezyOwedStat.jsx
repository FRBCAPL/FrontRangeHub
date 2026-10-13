import React from 'react';
import { money } from '../../utils/duezyMath.js';

const teamsText = (n) => `${n} ${n === 1 ? 'team' : 'teams'}`;

function Line({ className, onClick, title, children }) {
  if (!onClick) return <li className={className} title={title}>{children}</li>;
  return (
    <li className={className}>
      <button type="button" className="dz-owed-link" onClick={onClick} title={title}>{children} <span aria-hidden="true">›</span></button>
    </li>
  );
}

/**
 * "Still to collect" box: late (past grace), make-ups (postponed, never late), and this week's dues
 * that aren't late yet. owed = { late, lateTeams, makeup, makeupTeams, current }.
 */
export default function DuezyOwedStat({ owed, onShowLate, onShowMakeups, currentNote = '' }) {
  const { late = 0, lateTeams = 0, makeup = 0, makeupTeams = 0, current = 0 } = owed || {};
  const total = late + makeup + current;

  return (
    <div className={`dz-stat dz-owed ${late ? 'is-warn' : total ? '' : 'is-good'}`}>
      <span className="dz-stat-icon" aria-hidden="true">$</span>
      <small className="dz-owed-title">Still to collect</small>
      <strong>{money(total)}</strong>
      <ul className="dz-owed-list">
        {late > 0 ? (
          <Line className="is-late" onClick={onShowLate} title="Past the grace period">
            <b>{money(late)}</b> late · {teamsText(lateTeams)}
          </Line>
        ) : null}
        {makeup > 0 ? (
          <Line className="is-makeup" onClick={onShowMakeups} title="Postponed matches: still owed, but not late until they're made up">
            ↻ <b>{money(makeup)}</b> make-ups · {teamsText(makeupTeams)}
          </Line>
        ) : null}
        {current > 0 ? (
          <Line className="is-current" title={currentNote || undefined}>
            <b>{money(current)}</b> this week · not late yet
          </Line>
        ) : null}
        {total === 0 ? <li className="is-clear">Nothing owed right now</li> : null}
      </ul>
    </div>
  );
}
