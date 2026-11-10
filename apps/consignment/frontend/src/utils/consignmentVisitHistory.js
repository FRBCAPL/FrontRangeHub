/** Visitor history for the admin Visitors modal: one row per person, newest first, with their visits. */
import { visitIsMine, visitWhoKey } from './consignmentVisitStats.js';
import { SHOP_TIME_ZONE } from './consignmentTimeZone.js';

export const VISIT_PAGE_SIZE = 50;

export function visitWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: SHOP_TIME_ZONE,
    });
  } catch {
    return iso;
  }
}

/** "mark@example.com", "You", or "Guest · 3f9a" so different guests can be told apart. */
export function visitWhoLabel(row, mine) {
  if (mine) return 'You';
  const email = String(row?.visitor_email || '').trim();
  if (email) return email;
  const id = String(row?.visitor_id || '').replace(/[^a-z0-9]/gi, '');
  return id ? `Guest · ${id.slice(-4)}` : 'Guest';
}

/** rows are newest first (as loaded). */
export function visitorHistory(rows, mineId = '', mineEmail = '') {
  const people = new Map();
  rows.forEach((row) => {
    const key = visitWhoKey(row);
    let person = people.get(key);
    if (!person) {
      const mine = visitIsMine(row, mineId, mineEmail);
      person = { key, label: visitWhoLabel(row, mine), isMine: mine, signedIn: Boolean(row.visitor_email), visits: [], pages: new Set() };
      people.set(key, person);
    }
    person.visits.push(row);
    person.pages.add(row.path || '');
  });
  return [...people.values()].map((p) => ({
    key: p.key,
    label: p.label,
    isMine: p.isMine,
    signedIn: p.signedIn,
    visits: p.visits,
    views: p.visits.length,
    pageCount: p.pages.size,
    lastSeen: p.visits[0]?.created_at || '',
    firstSeen: p.visits[p.visits.length - 1]?.created_at || '',
  }));
}

/** Case-insensitive match on who, page label, path or referrer. */
export function visitMatches(row, query, labelFor) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return [row.visitor_email, labelFor(row), row.path, row.referrer]
    .some((v) => String(v || '').toLowerCase().includes(q));
}

/** Outside sites that sent visitors, most first. */
export function topReferrers(rows) {
  const counts = new Map();
  rows.forEach((row) => {
    let host = 'Direct / in-site';
    if (row.referrer) {
      try { host = new URL(row.referrer).hostname.replace(/^www\./, ''); } catch { host = row.referrer; }
    }
    counts.set(host, (counts.get(host) || 0) + 1);
  });
  return [...counts.entries()].map(([source, views]) => ({ source, views })).sort((a, b) => b.views - a.views);
}
