import React from 'react';

function JumpList({ label, weeks, schedule, canEdit, onJump, tone = '' }) {
  if (!weeks?.length) return null;
  return (
    <p className={`dz-small dz-week-jumps${tone ? ` ${tone}` : ''}`}>
      {label}{' '}
      {weeks.map((w, i) => (
        <React.Fragment key={w}>
          {i ? ', ' : ''}
          {canEdit ? (
            <button type="button" className="dz-late-jump" onClick={() => onJump(w)}>
              {schedule.label(w)}
            </button>
          ) : (
            schedule.label(w)
          )}
        </React.Fragment>
      ))}
    </p>
  );
}

/**
 * Tappable late / make-up / prepaid nights above the pay panel — jump the week strip/panel.
 */
export default function DuezyWeekJumps({ balance, schedule, canEdit, onJump }) {
  return (
    <div className="dz-week-jumps-block">
      <JumpList
        label="Late for"
        weeks={balance.lateWeeks}
        schedule={schedule}
        canEdit={canEdit}
        onJump={onJump}
        tone="dz-owe-late"
      />
      <JumpList
        label="↻ Make-up for"
        weeks={balance.makeupWeeks}
        schedule={schedule}
        canEdit={canEdit}
        onJump={onJump}
      />
      <JumpList
        label="↻ Paid · still to play"
        weeks={balance.prepaidWeeks}
        schedule={schedule}
        canEdit={canEdit}
        onJump={onJump}
      />
      <JumpList
        label="Paid ahead"
        weeks={balance.prepaidFutureWeeks}
        schedule={schedule}
        canEdit={canEdit}
        onJump={onJump}
      />
    </div>
  );
}
