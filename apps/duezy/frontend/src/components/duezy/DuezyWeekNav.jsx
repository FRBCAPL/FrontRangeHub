import React from 'react';
import useSeasonTerms from '../../hooks/useSeasonTerms.js';

/**
 * Full-width week strip: Week N on the left, date centered, Current week / Back on the right.
 */
export default function DuezyWeekNav({ weekNav }) {
  const terms = useSeasonTerms();
  if (!weekNav) return null;
  const offCurrent = weekNav.week !== weekNav.currentWeek;
  const label = weekNav.date
    ? `${weekNav.date}, week ${weekNav.week}`
    : `Week ${weekNav.week} of ${weekNav.total}`;

  return (
    <div className="dz-week-nav-wrap">
      <div className={`dz-week-nav${offCurrent ? ' is-off' : ''}`} role="group" aria-label={label}>
        <button
          type="button"
          disabled={weekNav.week <= 1}
          onClick={() => weekNav.onChange(weekNav.week - 1)}
          aria-label="Previous week"
        >
          ‹
        </button>
        <span className="dz-week-nav-mid">
          <span className="dz-week-nav-num">
            {weekNav.date ? `Week ${weekNav.week}` : `of ${weekNav.total}`}
          </span>
          <strong className="dz-week-nav-date">{weekNav.date || `Week ${weekNav.week}`}</strong>
          <button
            type="button"
            className={`dz-week-nav-status${offCurrent ? ' is-back' : ''}`}
            disabled={!offCurrent}
            onClick={() => weekNav.onChange(weekNav.currentWeek)}
          >
            {offCurrent ? 'Back to this week' : 'Current week'}
          </button>
        </span>
        <button
          type="button"
          disabled={weekNav.week >= weekNav.total}
          onClick={() => weekNav.onChange(weekNav.week + 1)}
          aria-label="Next week"
        >
          ›
        </button>
      </div>
      {weekNav.startLabel && !weekNav.started ? (
        <small className="dz-week-note">{terms.One} starts {weekNav.startLabel}</small>
      ) : null}
    </div>
  );
}
