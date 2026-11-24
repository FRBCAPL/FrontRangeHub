import React from 'react';
import { isPrepaidMakeup, money, paidFor } from '../../utils/duezyMath.js';

/** Small corner mark per status so the strip doesn't rely on color alone. */
const MARKS = { paid: '✓', partial: '½', bye: '⏸', makeup: '↻' };

/**
 * One box per week through the season (or so far if totalWeeks is unknown), colored by status.
 * With `onPick` the boxes are buttons; future weeks are for prepay.
 */
export default function DuezySeasonStrip({ teamId, week, dues, paymentIndex, schedule, openWeek = null, onPick }) {
  const throughCurrent = Math.max(week, schedule.started ? schedule.currentWeek : 0);
  const shown = Math.max(throughCurrent, Number(schedule.totalWeeks) || 0);
  return (
    <div className="dz-strip" aria-label="Season weeks">
      {Array.from({ length: shown }, (_, i) => {
        const w = i + 1;
        const p = paymentIndex.get(`${teamId}:${w}`);
        const status = p?.status || 'unpaid';
        const prepaid = isPrepaidMakeup(p);
        const future = w > schedule.currentWeek;
        const late = !['paid', 'bye', 'makeup'].includes(status) && !prepaid && w <= schedule.lateThrough;
        const night = schedule.dates ? `${schedule.label(w)} (week ${w})` : `Week ${w}`;
        let state = status === 'partial' ? `paid ${money(paidFor(p, dues))} of ${money(dues)}`
          : late ? 'late' : status === 'makeup' ? 'make up (still owed)' : status === 'unpaid' ? 'not paid yet' : status;
        if (prepaid) state += ' · make-up still to play';
        else if (future && (status === 'paid' || status === 'partial')) state += ' · paid ahead';
        else if (future && status === 'unpaid') state = 'future · tap to prepay';
        const className = [
          `is-${status}`,
          prepaid && 'is-prepaid',
          future && 'is-future',
          late && 'is-late',
          w === week && 'is-current',
          w === openWeek && 'is-open',
        ].filter(Boolean).join(' ');
        const mark = prepaid ? '↻' : late ? '!' : MARKS[status];
        const body = <>{w}{mark ? <small className="dz-strip-mark" aria-hidden="true">{mark}</small> : null}</>;
        if (!onPick) return <span key={w} className={className} title={`${night}: ${state}`} aria-label={`${night}: ${state}`}>{body}</span>;
        return (
          <button
            key={w}
            type="button"
            className={className}
            title={`${night}: ${state} — tap to record`}
            aria-label={`${night}: ${state}`}
            aria-pressed={w === openWeek}
            onClick={() => onPick(w === openWeek ? null : w)}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
