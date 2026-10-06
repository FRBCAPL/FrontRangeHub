const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + Number(days) * DAY_MS);
}

export function formatShortDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Whole days from now until `value` (negative once passed). */
export function daysUntil(value) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / DAY_MS);
}

/** New expiry for a renewal: extends from the current expiry, or from today if already past. */
export function renewedExpiry(currentExpiry, days) {
  const base = currentExpiry && new Date(currentExpiry).getTime() > Date.now() ? currentExpiry : new Date();
  return addDays(base, days);
}

export function pickupDeadline(expiresAt, graceDays) {
  return expiresAt ? addDays(expiresAt, graceDays) : null;
}
