export const AUCTION_LENGTH_OPTIONS = [3, 5, 7, 10, 14];
export const DEFAULT_AUCTION_DAYS = 7;
export const AUCTION_END_WEEKDAY = 0;
export const AUCTION_END_HOUR = 21;
const MIN_AUCTION_HOURS = 24;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Default end for an auction started at `start` running about `days` days.
 * Ends at 9 PM local; with `snapToWeekday`, moves to the nearest Sunday (within ±3 days),
 * pushing a week later if that would leave less than 24 hours.
 */
export function defaultAuctionEnd(start, days, { snapToWeekday = true } = {}) {
  const begin = new Date(start);
  const end = new Date(begin);
  end.setDate(end.getDate() + Number(days));
  end.setHours(AUCTION_END_HOUR, 0, 0, 0);
  if (snapToWeekday) {
    let delta = (AUCTION_END_WEEKDAY - end.getDay() + 7) % 7;
    if (delta > 3) delta -= 7;
    end.setDate(end.getDate() + delta);
  }
  while (end.getTime() - begin.getTime() < MIN_AUCTION_HOURS * 60 * 60 * 1000) {
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
