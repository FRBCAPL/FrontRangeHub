/**
 * League payment & reminder preferences: tap-to-pay handles, which methods a league uses, the
 * default method for amount and correction forms, and the payment lines added to reminders. Columns come from
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

/** payment_methods holds at most this many entries (database check). */
export const MAX_METHODS = 12;
export const METHOD_NAME_MAX = 24;

export const cleanMethodName = (raw) => String(raw || '').replace(/\s+/g, ' ').trim().slice(0, METHOD_NAME_MAX);

/** Names the league added under "Other" (anything that isn't a standard method), first spelling wins. */
function customsIn(list) {
  const seen = new Set(METHODS.map((m) => m.toLowerCase()));
  const out = [];
  (list || []).forEach((raw) => {
    const name = cleanMethodName(raw);
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push(name);
    }
  });
  return out;
}

export const customMethods = (league) => customsIn(Array.isArray(league?.payment_methods) ? league.payment_methods : []);

/** Methods this league uses: chosen standard ones in the standard order, then its own; all standard ones when none are chosen. */
export function leagueMethods(league) {
  const chosen = Array.isArray(league?.payment_methods) ? league.payment_methods : [];
  const list = [...METHODS.filter((m) => chosen.includes(m)), ...customsIn(chosen)];
  return list.length ? list : METHODS;
}

/** The existing method this name means (case-insensitive), or null if it's new. */
export function findMethod(methods, raw) {
  const name = cleanMethodName(raw).toLowerCase();
  return [...METHODS, ...methods].find((m) => m.toLowerCase() === name) || null;
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

/**
 * null when every standard method is chosen and there are no custom ones (= no restriction), so
 * standard methods added later show up automatically.
 */
export function methodsToSave(chosen) {
  const list = METHODS.filter((m) => (chosen || []).includes(m));
  const customs = customsIn(chosen);
  if (!customs.length) return list.length && list.length < METHODS.length ? list : null;
  return [...list, ...customs].slice(0, MAX_METHODS);
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
