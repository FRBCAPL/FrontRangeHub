/** Visitor stats for the admin Visitors tab. "Mine" = this browser's id or the admin's sign-in email. */
import { shopDateKey, shopParts, shopTime } from './consignmentTimeZone.js';

function visitEmail(row) {
  return String(row?.visitor_email || '').trim().toLowerCase();
}

export function visitWhoKey(row) {
  return visitEmail(row) || String(row?.visitor_id || '');
}

export function visitIsMine(row, mineId = '', mineEmail = '') {
  const mine = String(mineEmail || '').trim().toLowerCase();
  const email = visitEmail(row);
  if (mine && email && email === mine) return true;
  return Boolean(mineId && row?.visitor_id === mineId);
}

/** Midnight in Colorado at the start of the last `days` days (today counts as one). */
export function visitsSinceIso(days, now = new Date()) {
  const p = shopParts(now);
  return shopTime(p.year, p.month, p.day - (days - 1)).toISOString();
}

export function summarizeVisits(rows, labelFor, mineId = '', mineEmail = '', now = new Date()) {
  const isMine = (row) => visitIsMine(row, mineId, mineEmail);
  const others = rows.filter((row) => !isMine(row));
  const todayKey = shopDateKey(now);
  const todayOthers = others.filter((row) => row.created_at && shopDateKey(row.created_at) === todayKey);

  const pages = new Map();
  others.forEach((row) => {
    const key = row.path || '';
    const current = pages.get(key) || { path: key, label: labelFor(row), views: 0, visitors: new Set() };
    current.views += 1;
    current.visitors.add(visitWhoKey(row));
    pages.set(key, current);
  });

  return {
    views: others.length,
    visitors: new Set(others.map(visitWhoKey)).size,
    mineViews: rows.length - others.length,
    todayViews: todayOthers.length,
    todayVisitors: new Set(todayOthers.map(visitWhoKey)).size,
    pages: [...pages.values()]
      .map((p) => ({ path: p.path, label: p.label, views: p.views, visitors: p.visitors.size }))
      .sort((a, b) => b.views - a.views),
    recent: rows.slice(0, 25).map((row) => {
      const mine = isMine(row);
      return { ...row, isMine: mine, whoLabel: mine ? 'You' : (String(row.visitor_email || '').trim() || 'Guest') };
    }),
  };
}
