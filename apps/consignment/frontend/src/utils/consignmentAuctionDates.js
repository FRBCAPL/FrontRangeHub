export const MIN_AUCTION_DAYS = 7;
export const AUCTION_LENGTH_OPTIONS = [7, 10, 14];
export const DEFAULT_AUCTION_DAYS = 7;
export const AUCTION_END_WEEKDAY = 0;
export const AUCTION_END_HOUR = 21;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Slack so a default end is still a full minimum length when the admin saves a bit later. */
const SAVE_SLACK_MS = 60 * 60 * 1000;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** True when an auction starting now and ending at `end` meets the minimum length. */
export function meetsMinimumLength(end, now = new Date()) {
  return new Date(end).getTime() - new Date(now).getTime() >= MIN_AUCTION_DAYS * DAY_MS;
}

/**
 * Default end for an auction started at `start` running at least `days` days (never under
 * MIN_AUCTION_DAYS). Ends at 9 PM local; with `snapToWeekday`, moves forward to the next Sunday.
 */
export function defaultAuctionEnd(start, days, { snapToWeekday = true } = {}) {
  const length = Math.max(Number(days) || 0, MIN_AUCTION_DAYS);
  const begin = new Date(start);
  const end = new Date(begin);
  end.setDate(end.getDate() + length);
  end.setHours(AUCTION_END_HOUR, 0, 0, 0);
  if (snapToWeekday) end.setDate(end.getDate() + ((AUCTION_END_WEEKDAY - end.getDay() + 7) % 7));
  while (end.getTime() - begin.getTime() < length * DAY_MS + SAVE_SLACK_MS) {
    end.setDate(end.getDate() + (snapToWeekday ? 7 : 1));
  }
  return end;
}

export function auctionEndLabel() {
  const hour = AUCTION_END_HOUR % 12 || 12;
  return `${WEEKDAYS[AUCTION_END_WEEKDAY]} ${hour} ${AUCTION_END_HOUR >= 12 ? 'PM' : 'AM'}`;
}

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** "3d 4h", "4h 12m", "12:05" (under an hour), or "Ended". */
export function formatCountdown(ms) {
  if (!(ms > 0)) return 'Ended';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function hoursBetween(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / (60 * 60 * 1000);
}
