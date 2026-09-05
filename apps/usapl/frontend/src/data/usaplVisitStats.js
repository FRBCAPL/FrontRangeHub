export function usaplVisitsSinceIso(days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start.toISOString();
}

export function summarizeUsaplVisits(rows, divisions = [], labelFor) {
  const views = rows.length;
  const visitors = new Set(rows.map((row) => row.visitor_id)).size;
  const todayKey = new Date().toDateString();
  const todayRows = rows.filter((row) => row.created_at && new Date(row.created_at).toDateString() === todayKey);
  const pages = new Map();

  rows.forEach((row) => {
    const key = row.path || '';
    const current = pages.get(key) || { path: key, views: 0, visitors: new Set() };
    current.views += 1;
    current.visitors.add(row.visitor_id);
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
    todayViews: todayRows.length,
    todayVisitors: new Set(todayRows.map((row) => row.visitor_id)).size,
    pages: pageRows,
    recent: rows.slice(0, 25),
  };
}
