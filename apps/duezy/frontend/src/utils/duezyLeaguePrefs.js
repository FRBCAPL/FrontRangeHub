/**
 * League payment & reminder preferences: tap-to-pay handles, which methods a league uses, the
 * default for one-tap "Paid", and the payment lines added to reminders. Columns come from
 * duezy-league-preferences-2026-10.sql; every helper copes with them being missing.
 */
import { METHODS } from '../data/duezyOptions.js';

export const PAY_HANDLES = [
  { key: 'venmo', label: 'Venmo', placeholder: '@yourname', link: (h) => `https://venmo.com/u/${h}` },
  { key: 'cashapp', label: 'Cash App', placeholder: '$yourtag', link: (h) => `https://cash.app/$${h}` },
  { key: 'paypal', label: 'PayPal', placeholder: 'paypal.me name', link: (h) => `https://paypal.me/${h}` },
  { key: 'zelle', label: 'Zelle', placeholder: 'Phone or email', link: null },
];

/** Strip pasted links and leading @ / $ so "https://venmo.com/u/@sam" and "@sam" both become "sam". */
export function cleanHandle(key, raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (key === 'zelle') return s.slice(0, 80);
  const last = s.replace(/[?#].*$/, '').replace(/\/+$/, '').split('/').pop();
  return last.replace(/^[@$]+/, '').replace(/[^\w.-]/g, '').slice(0, 60);
}

/** Cleaned handles object for saving, or null when none are filled in. */
export function handlesToSave(handles = {}) {
  const out = {};
  PAY_HANDLES.forEach(({ key }) => {
    const v = cleanHandle(key, handles?.[key]);
    if (v) out[key] = v;
  });
  return Object.keys(out).length ? out : null;
}

/** ["Venmo: https://venmo.com/u/sam", "Zelle: 303-555-1212"] in a fixed order. */
export function payLines(league) {
  const handles = league?.pay_handles || {};
  return PAY_HANDLES
    .map(({ key, label, link }) => {
      const v = cleanHandle(key, handles[key]);
      if (!v) return null;
      return `${label}: ${link ? link(v) : v}`;
    })
    .filter(Boolean);
}

/** Everything a reminder should say about paying: the free-text note, then the tap-to-pay lines. */
export function paymentLines(league) {
  const note = league?.payment_note?.trim();
  return [...(note ? [note] : []), ...payLines(league)];
}

export const hasPaymentInfo = (league) => paymentLines(league).length > 0;

/** Methods this league uses, in the standard order; all of them when none are chosen. */
export function leagueMethods(league) {
  const chosen = Array.isArray(league?.payment_methods) ? league.payment_methods : [];
  const list = METHODS.filter((m) => chosen.includes(m));
  return list.length ? list : METHODS;
}

export function defaultMethod(league) {
  const list = leagueMethods(league);
  return list.includes(league?.default_method) ? league.default_method : list[0];
}

/** Dropdown options that always include the entry's own method (an old entry may use one the league dropped). */
export function methodOptions(league, current) {
  const list = leagueMethods(league);
  return current && !list.includes(current) ? [...list, current] : list;
}

/** null when every method is chosen (= no restriction), so new methods added later show up automatically. */
export function methodsToSave(chosen) {
  const list = METHODS.filter((m) => (chosen || []).includes(m));
  return list.length && list.length < METHODS.length ? list : null;
}

export const TIME_ZONES = [
  { id: 'America/New_York', label: 'Eastern' },
  { id: 'America/Chicago', label: 'Central' },
  { id: 'America/Denver', label: 'Mountain' },
  { id: 'America/Phoenix', label: 'Arizona (no daylight saving)' },
  { id: 'America/Los_Angeles', label: 'Pacific' },
  { id: 'America/Anchorage', label: 'Alaska' },
  { id: 'Pacific/Honolulu', label: 'Hawaii' },
];

/** The US list plus the league's saved zone and this browser's zone when they aren't on it. */
export function timeZoneOptions(saved, browser) {
  const list = [...TIME_ZONES];
  [saved, browser].forEach((id) => {
    if (id && !list.some((z) => z.id === id)) list.push({ id, label: id.replace(/_/g, ' ') });
  });
  return list;
}
