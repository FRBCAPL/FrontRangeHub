import { showdownPublicHash } from './showdownPublicRoutes.js';

const STALE_MS = 24 * 60 * 60 * 1000;

/** Players only see Showdowns still in progress; completed and abandoned (no update in a day) events are hidden. */
export function liveShowdownRows(rows, now = Date.now()) {
  return (rows || []).filter((r) => {
    if (!r || r.status === 'completed' || r.status === 'setup') return false;
    const t = Date.parse(r.updated_at);
    return Number.isNaN(t) || now - t < STALE_MS;
  });
}

/** One live Showdown as a pick-list entry (homepage banner, Current tournaments page). */
export function liveShowdownItem(row) {
  return {
    id: `sd-${row.id}`,
    path: showdownPublicHash(row.id),
    name: row.name || 'Cash Climb Showdown',
    detail: ['Live Showdown', row.venue].filter(Boolean).join(' \u00b7 '),
  };
}

/** Live Showdowns as pick-list entries; an unreachable cloud gives an empty list rather than an error. */
export async function listLiveShowdownItems(api) {
  try {
    const res = await api.publicList();
    return liveShowdownRows(Array.isArray(res?.data) ? res.data : []).map(liveShowdownItem);
  } catch {
    return [];
  }
}
