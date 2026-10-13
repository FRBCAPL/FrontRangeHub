import React from 'react';
import { money, paidFor } from '../../utils/duezyMath.js';

/**
 * One box per week so far, colored by status. With `onPick` the boxes are buttons
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
        const late = !['paid', 'bye', 'makeup'].includes(status) && w <= schedule.lateThrough;
        const night = schedule.dates ? `${schedule.label(w)} (week ${w})` : `Week ${w}`;
        const state = status === 'partial' ? `paid ${money(paidFor(p, dues))} of ${money(dues)}`
          : late ? 'late' : status === 'makeup' ? 'make up (still owed)' : status === 'unpaid' ? 'not paid yet' : status;
        const className = [`is-${status}`, late && 'is-late', w === week && 'is-current', w === openWeek && 'is-open']
          .filter(Boolean).join(' ');
        if (!onPick) return <span key={w} className={className} title={`${night}: ${state}`}>{w}</span>;
        return (
          <button
            key={w}
            type="button"
            className={className}
            title={`${night}: ${state} — tap to record`}
            aria-pressed={w === openWeek}
            onClick={() => onPick(w === openWeek ? null : w)}
          >
            {w}
          </button>
        );
      })}
    </div>
  );
}
