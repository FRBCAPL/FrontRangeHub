import React, { useState } from 'react';
import { GRACE_OPTIONS, graceLabel, isISODate, shortDate, weekDates, weekdayOf } from '../../utils/duezySchedule.js';

/**
 * First night, skip dates and grace period.
 * graceMode: 'default' (league setting) | 'override' (division; blank = league default) | 'none'.
 */
export default function DuezyScheduleFields({ value, onChange, graceMode = 'default', defaultGrace = 0, showDates = true, dateLabel = 'First night of play' }) {
  const [skip, setSkip] = useState('');
  const dates = showDates ? weekDates(value) : null;
  const skips = value.skip_dates || [];

  const pickStart = (start_date) => {
    onChange(isISODate(start_date) ? { start_date, play_day: weekdayOf(start_date) } : { start_date: '' });
  };

  const addSkip = () => {
    if (!isISODate(skip) || skips.includes(skip)) return;
    onChange({ skip_dates: [...skips, skip].sort() });
    setSkip('');
  };

  return (
    <div className="dz-stack dz-schedule">
      {showDates ? (
        <>
          <label className="dz-field">
            <span>{dateLabel} <em className="dz-muted">(optional)</em></span>
            <input type="date" value={value.start_date || ''} onChange={(e) => pickStart(e.target.value)} />
          </label>
          {dates ? (
            <p className="dz-small dz-muted">
              {weekdayOf(dates[0])}s · week 1 is {shortDate(dates[0])}
              {dates.length > 1 ? `, week ${dates.length} is ${shortDate(dates[dates.length - 1])}` : ''}.
              Duezy moves to the next week by itself.
            </p>
          ) : (
            <p className="dz-small dz-muted">Add a date and Duezy moves to the next week by itself and knows when dues are late.</p>
          )}

          {dates ? (
            <div className="dz-field">
              <span>Nights off (holidays, rain-outs)</span>
              <div className="dz-inline-form">
                <input type="date" value={skip} min={value.start_date} onChange={(e) => setSkip(e.target.value)} aria-label="Night off" />
                <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={addSkip} disabled={!isISODate(skip)}>Add</button>
              </div>
              {skips.length ? (
                <div className="dz-skip-chips">
                  {skips.map((d) => (
                    <button key={d} type="button" className="dz-skip-chip" onClick={() => onChange({ skip_dates: skips.filter((x) => x !== d) })} aria-label={`Remove ${shortDate(d)}`}>
                      {shortDate(d)} <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="dz-small dz-muted">The schedule moves back a week for each night off.</p>
              )}
            </div>
          ) : null}
        </>
      ) : null}

      {graceMode !== 'none' ? (
        <label className="dz-field">
          <span>A team is late if they haven't paid by…</span>
          <select
            value={value.grace_days ?? (graceMode === 'override' ? '' : 0)}
            onChange={(e) => onChange({ grace_days: e.target.value === '' ? '' : Number(e.target.value) })}
          >
            {graceMode === 'override' ? <option value="">League default ({graceLabel(defaultGrace).toLowerCase()})</option> : null}
            {GRACE_OPTIONS.map((n) => <option key={n} value={n}>{graceLabel(n)}</option>)}
          </select>
        </label>
      ) : null}
    </div>
  );
}
