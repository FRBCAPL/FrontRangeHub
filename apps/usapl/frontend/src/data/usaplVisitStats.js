import { visitIsMine, visitWhoKey, visitWhoLabel } from './usaplVisitWho.js';

export function usaplVisitsSinceIso(days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start.toISOString();
}

export function summarizeUsaplVisits(rows, divisions = [], labelFor, mineId = '', mineEmail = '') {
  const isMine = (row) => visitIsMine(row, mineId, mineEmail);
  const others = rows.filter((row) => !isMine(row));
  const mineRows = rows.filter(isMine);
  const views = others.length;
  const visitors = new Set(others.map(visitWhoKey)).size;
  const todayKey = new Date().toDateString();
  const todayOthers = others.filter((row) => row.created_at && new Date(row.created_at).toDateString() === todayKey);
  const pages = new Map();

  others.forEach((row) => {
    const key = row.path || '';
    const current = pages.get(key) || { path: key, views: 0, visitors: new Set() };
    current.views += 1;
    current.visitors.add(visitWhoKey(row));
    current.label = labelFor ? labelFor(row, divisions) : (row.page_label || key);
    pages.set(key, current);
  });

  const pageRows = [...pages.values()]
    .map((row) => ({
      path: row.path,
      label: row.label,
      views: row.views,
      visitors: row.visitors.size,
    }))
    .sort((a, b) => b.views - a.views);

  return {
    views,
    visitors,
    mineViews: mineRows.length,
    todayViews: todayOthers.length,
    todayVisitors: new Set(todayOthers.map(visitWhoKey)).size,
    pages: pageRows,
    recent: rows.slice(0, 25).map((row) => ({
      ...row,
      isMine: isMine(row),
      whoLabel: visitWhoLabel(row, isMine(row)),
    })),
  };
}
