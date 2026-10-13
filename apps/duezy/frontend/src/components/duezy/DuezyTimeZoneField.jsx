import React from 'react';
import { timeZoneOptions } from '../../utils/duezyLeaguePrefs.js';
import { browserTimeZone, shortDate, todayISO } from '../../utils/duezySchedule.js';

/** League time zone: decides when "today" rolls over, so when a night's dues turn late. */
export default function DuezyTimeZoneField({ value, onChange }) {
  const browser = browserTimeZone();
  const current = value || browser || 'America/Denver';
  return (
    <label className="dz-field">
      <span>League time zone</span>
      <select value={current} onChange={(e) => onChange(e.target.value)}>
        {timeZoneOptions(current, browser).map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
      </select>
      <small className="dz-small dz-muted">
        Dues turn late by the league’s clock, not your phone’s. It’s {shortDate(todayISO(current))} there now.
      </small>
    </label>
  );
}
