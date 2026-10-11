/** Every auction runs exactly this long from the moment it starts (late bids can still extend it). */
export const AUCTION_DAYS = 7;

/** End time for an auction starting at `start`: the same time of day, AUCTION_DAYS later. */
export function auctionEndFrom(start = new Date()) {
  const end = new Date(start);
  end.setDate(end.getDate() + AUCTION_DAYS);
  return end;
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

/** Compact end time for cards: "Oct 18, 7:30 PM" (a weekday alone is ambiguous for 7-day auctions). */
export function formatShortEnd(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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