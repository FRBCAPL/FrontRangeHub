const TZ = 'America/Denver';

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

function denverParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function denverDateKey(isoOrDate) {
  const p = denverParts(isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate));
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Midnight Mountain Time at the start of the last `days` days (today counts as one). */
export function visitsSinceIso(days, now = new Date()) {
  const p = denverParts(now);
  const start = new Date(Date.UTC(p.year, p.month - 1, p.day - (days - 1), 7, 0, 0));
  // 07:00 UTC ≈ midnight MST; during MDT this is still “today-ish” for a range floor.
  return start.toISOString();
}

export function summarizeVisits(rows, labelFor, mineId = '', mineEmail = '', now = new Date()) {
  const isMine = (row) => visitIsMine(row, mineId, mineEmail);
  const others = rows.filter((row) => !isMine(row));
  const todayKey = denverDateKey(now);
  const todayOthers = others.filter((row) => row.created_at && denverDateKey(row.created_at) === todayKey);

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
      .sort((a, b) => b.views - a.views)
  };
}

export function visitWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: TZ
    });
  } catch {
    return iso;
  }
}

export function visitWhoLabel(row, mine) {
  if (mine) return 'You';
  const email = String(row?.visitor_email || '').trim();
  if (email) return email;
  const id = String(row?.visitor_id || '').replace(/[^a-z0-9]/gi, '');
  return id ? `Guest · ${id.slice(-4)}` : 'Guest';
}

export function visitorHistory(rows, mineId = '', mineEmail = '') {
  const people = new Map();
  rows.forEach((row) => {
    const key = visitWhoKey(row);
    let person = people.get(key);
    if (!person) {
      const mine = visitIsMine(row, mineId, mineEmail);
      person = {
        key,
        label: visitWhoLabel(row, mine),
        isMine: mine,
        visits: [],
        pages: new Set()
      };
      people.set(key, person);
    }
    person.visits.push(row);
    person.pages.add(row.path || '');
  });
  return [...people.values()].map((p) => ({
    key: p.key,
    label: p.label,
    isMine: p.isMine,
    views: p.visits.length,
    pageCount: p.pages.size,
    lastSeen: p.visits[0]?.created_at || '',
    firstSeen: p.visits[p.visits.length - 1]?.created_at || ''
  }));
}
