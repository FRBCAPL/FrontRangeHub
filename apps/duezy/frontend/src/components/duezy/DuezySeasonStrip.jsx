import React from 'react';
import { isPrepaidMakeup, money, paidFor } from '../../utils/duezyMath.js';

/** Small corner mark per status so the strip doesn't rely on color alone. */
const MARKS = { paid: '✓', partial: '½', bye: '⏸', makeup: '↻' };

/**
 * One box per week so far, colored by status and marked (✓ ½ ⏸ ↻ !). With `onPick` the boxes are buttons
 * (tap to record that week); `openWeek` is outlined and `week` (the page's week) gets a marker.
 */
export default function DuezySeasonStrip({ teamId, week, dues, paymentIndex, schedule, openWeek = null, onPick }) {
  const shown = Math.max(week, schedule.started ? schedule.currentWeek : 0);
  return (
    <div className="dz-strip" aria-label="Season so far">
      {Array.from({ length: shown }, (_, i) => {
        const w = i + 1;
        const p = paymentIndex.get(`${teamId}:${w}`);
        const status = p?.status || 'unpaid';
        const prepaid = isPrepaidMakeup(p);
        const late = !['paid', 'bye', 'makeup'].includes(status) && !prepaid && w <= schedule.lateThrough;
        const night = schedule.dates ? `${schedule.label(w)} (week ${w})` : `Week ${w}`;
        let state = status === 'partial' ? `paid ${money(paidFor(p, dues))} of ${money(dues)}`
          : late ? 'late' : status === 'makeup' ? 'make up (still owed)' : status === 'unpaid' ? 'not paid yet' : status;
        if (prepaid) state += ' · make-up still to play';
        const className = [`is-${status}`, prepaid && 'is-prepaid', late && 'is-late', w === week && 'is-current', w === openWeek && 'is-open']
          .filter(Boolean).join(' ');
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
