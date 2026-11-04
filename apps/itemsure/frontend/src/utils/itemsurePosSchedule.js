// Words for the automatic Clover sales import schedule.

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Defaults when automatic imports are first turned on: weekly, Sunday, 11:00 PM. */
export const DEFAULT_SCHEDULE = Object.freeze({ frequency: 'weekly', weekday: 0, time: '23:00' });

/** "23:00" -> "11:00 PM". */
export function timeText(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return '';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "America/Denver" -> "Mountain Time" where the browser knows it, else "America/Denver". */
export function zoneText(zone) {
  if (!zone) return '';
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longGeneric' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part?.value || zone.replace(/_/g, ' ');
  } catch {
    return zone.replace(/_/g, ' ');
  }
}

/** "Every Sunday at 11:00 PM" / "Every day at 6:30 AM". */
export function scheduleText({ frequency, weekday, time }) {
  const at = timeText(time);
  if (frequency === 'daily') return `Every day at ${at}`;
  return `Every ${WEEKDAYS[weekday] ?? WEEKDAYS[0]} at ${at}`;
}

/** True when automatic imports are on but no scheduler is checking in, so nothing will run. */
export const schedulerMissing = (status) => Boolean(status?.on && !status.scheduler_active);
