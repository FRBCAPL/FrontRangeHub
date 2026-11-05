// Taking Clover sales off stock: which windows to bring in and take off, and one combined result.

const HOUR = 3600 * 1000;
const MAX_WINDOW = 44 * 24 * HOUR;

/** Finished-hour windows from `throughIso` up to the start of the current hour, at most 44 days each. */
export function takeWindows(throughIso, now = Date.now()) {
  const end = Math.floor(now / HOUR) * HOUR;
  const windows = [];
  for (let from = Date.parse(throughIso); Number.isFinite(from) && from < end; from += MAX_WINDOW) {
    windows.push([new Date(from).toISOString(), new Date(Math.min(from + MAX_WINDOW, end)).toISOString()]);
  }
  return windows;
}

/** One result from several take_pos_sales calls. Missing setups are listed once each. */
export function mergeTakeResults(results) {
  const out = { taken: 0, counted: 0, notSetUp: 0, short: [], missing: [], to: null, addOns: false };
  const seen = new Set();
  for (const r of results) {
    if (!r || r.nothing) continue;
    out.addOns = out.addOns || r.add_ons === true;
    out.taken += r.taken || 0;
    out.counted += r.counted || 0;
    out.notSetUp += r.not_set_up || 0;
    out.short.push(...(r.short || []));
    for (const m of r.missing || []) {
      const key = `${m.external_id}|${m.item_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.missing.push(m);
      }
    }
    out.to = r.to || out.to;
  }
  return out;
}

/**
 * Spots in the order sales come out of them: the saved order first, then the rest by name
 * (the same order the database uses). Inactive spots only show if they are in the saved order.
 */
export function orderedSpots(areas, savedIds) {
  const byId = new Map(areas.map((a) => [a.id, a]));
  const saved = savedIds.map((id) => byId.get(id)).filter(Boolean);
  const rest = areas
    .filter((a) => a.is_active !== false && !savedIds.includes(a.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...saved, ...rest];
}

/** A copy of `list` with item `index` moved one place up (-1) or down (+1). */
export function moveSpot(list, index, step) {
  const to = index + step;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** Shortfalls added up per item: [{ itemId, name, unit, short }], biggest first. */
export function shortByItem(short) {
  const byItem = new Map();
  for (const s of short) {
    const row = byItem.get(s.item_id) || { itemId: s.item_id, name: s.item_name, unit: s.unit, short: 0 };
    row.short += Number(s.short) || 0;
    byItem.set(s.item_id, row);
  }
  return [...byItem.values()].sort((a, b) => b.short - a.short);
}
