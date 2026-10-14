import { shopDateKey, shopTime } from './consignmentTimeZone.js';

/** A form value as a number, or null when blank or not a number. */
export function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Value for <input type="date">: the Colorado calendar day. */
export function toDateInput(value) {
  return value ? shopDateKey(value) : '';
}

/** End of the chosen Colorado day, so an item listed "until Oct 30" stays up all of Oct 30. */
export function fromDateInput(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return shopTime(y, m, d, 23, 59, 59).toISOString();
}

/** Noon in Colorado on the chosen day, for "paid on" dates that only need the day. */
export function middayFromDateInput(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return shopTime(y, m, d, 12).toISOString();
}
