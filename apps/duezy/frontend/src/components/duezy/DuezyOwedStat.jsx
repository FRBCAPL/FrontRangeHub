import React from 'react';
import { money } from '../../utils/duezyMath.js';

const teamsText = (n) => `${n} ${n === 1 ? 'team' : 'teams'}`;

function Chip({ className, onClick, title, children }) {
  if (!onClick) {
    return <span className={`dz-owed-chip ${className}`} title={title}>{children}</span>;
  }
  return (
    <button type="button" className={`dz-owed-chip dz-owed-link ${className}`} onClick={onClick} title={title}>
      {children} <span aria-hidden="true">›</span>
    </button>
  );
}

/**
 * "Still to collect" box: late (past grace), make-ups (postponed, never late), and this week's dues
 * that aren't late yet. Prepaid chips jump to the Prepay section (make-up to play + future weeks).
 */
export default function DuezyOwedStat({
  owed, onShowLate, onShowMakeups, onShowPrepay, currentNote = '',
}) {
  const {
    late = 0, lateTeams = 0, makeup = 0, makeupTeams = 0,
    prepaidTeams = 0, prepaidFutureTeams = 0, current = 0,
  } = owed || {};
  const total = late + makeup + current;
  const openPrepay = onShowPrepay || onShowMakeups;

  return (
    <div className={`dz-stat dz-owed ${late ? 'is-warn' : total ? '' : 'is-good'}`}>
      <span className="dz-stat-icon" aria-hidden="true">$</span>
      <small className="dz-owed-title">Still to collect</small>
      <strong>{money(total)}</strong>
      <div className="dz-owed-chips">
        {late > 0 ? (
          <Chip className="is-late" onClick={onShowLate} title="Past the grace period">
            <b>{money(late)}</b> late · {teamsText(lateTeams)}
          </Chip>
        ) : null}
        {makeup > 0 ? (
          <Chip className="is-makeup" onClick={onShowMakeups} title="Postponed matches: still owed, but not late until they're made up">
            ↻ <b>{money(makeup)}</b> make-ups · {teamsText(makeupTeams)}
          </Chip>
        ) : null}
        {prepaidTeams > 0 ? (
          <Chip className="is-makeup" onClick={openPrepay} title="Paid for a make-up that hasn't been played yet — see Prepay">
            ↻ {prepaidTeams} prepaid to play
          </Chip>
        ) : null}
        {prepaidFutureTeams > 0 ? (
          <Chip className="is-makeup" onClick={openPrepay} title="Dues collected for weeks that haven't arrived yet">
            {prepaidFutureTeams} paid ahead
          </Chip>
        ) : null}
        {current > 0 ? (
          <Chip className="is-current" title={currentNote || undefined}>
            <b>{money(current)}</b> this week
          </Chip>
        ) : null}
        {total === 0 ? <span className="dz-owed-chip is-clear">Nothing owed</span> : null}
      </div>
    </div>
  );
}
