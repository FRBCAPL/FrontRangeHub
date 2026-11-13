import { VENUE_TIME_ZONE } from '../data/legendsSchedule.js';

/** Calendar date at the venue as YYYY-MM-DD. */
export function venueDateKey(date, timeZone = VENUE_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function venueDateLabel(date, timeZone = VENUE_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric' }).format(date);
}
