/**
 * League-night dates for Duezy. Dates are plain 'YYYY-MM-DD' strings; math runs in UTC so
 * daylight-saving changes never shift a night.
 */

export const GRACE_OPTIONS = [0, 1, 2, 3, 7, 14];

/** The payment deadline for a grace period; a team is late the day after it. */
export const graceLabel = (days) => {
  const n = Number(days) || 0;
  if (n === 0) return 'League night';
  return `${n} day${n === 1 ? '' : 's'} after league night`;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toUTC = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(toUTC(s).getTime());

export function addDays(iso, days) {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const weekdayOf = (iso) => DAY_NAMES[toUTC(iso).getUTCDay()];

export const shortDate = (iso) =>
  toUTC(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
};

/** Today as 'YYYY-MM-DD' in the league's time zone (falls back to this device's). */
export function todayISO(timeZone, now = new Date()) {
  const fmt = (tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  try {
    return fmt(timeZone || undefined);
  } catch {
    return fmt(undefined);
  }
}

/** Every league night for the season, skipping skip_dates. null when no start date is set. */
export function weekDates(unit) {
  if (!isISODate(unit?.start_date)) return null;
  const total = Math.max(1, Number(unit.total_weeks) || 1);
  const skips = new Set((unit.skip_dates || []).filter(isISODate));
  const dates = [];
  let night = unit.start_date;
  for (let guard = 0; dates.length < total && guard < total + 120; guard += 1) {
    if (!skips.has(night)) dates.push(night);
    night = addDays(night, 7);
  }
  return dates;
}

/** Most recent night on or before today (1 before the season starts, last week after it ends). */
export function currentWeekOn(dates, today) {
  const played = dates.filter((d) => d <= today).length;
  return Math.max(1, Math.min(played, dates.length));
}

/** Last week whose dues are now late: night + grace days has passed. 0 = nothing late yet. */
export function lateThroughOn(dates, today, graceDays = 0) {
  const grace = Math.max(0, Number(graceDays) || 0);
  return dates.filter((d) => addDays(d, grace) < today).length;
}

/** Date the dues for this night become late. */
export const lateAfter = (night, graceDays = 0) => addDays(night, Math.max(0, Number(graceDays) || 0));

/** Settings → database fields; only keys the form actually has, so old databases keep working. */
export function scheduleToSave(form, { league = false } = {}) {
  const out = {};
  if ('start_date' in form) out.start_date = isISODate(form.start_date) ? form.start_date : null;
  if ('skip_dates' in form) out.skip_dates = [...new Set((form.skip_dates || []).filter(isISODate))].sort();
  if ('grace_days' in form) {
    const blank = form.grace_days === '' || form.grace_days === null || form.grace_days === undefined;
    out.grace_days = blank ? (league ? 0 : null) : Math.max(0, Math.min(60, Number(form.grace_days) || 0));
  }
  if (league && out.start_date) out.timezone = form.timezone || browserTimeZone();
  return out;
}
