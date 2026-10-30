// Owner's "All needs": every place in every location that is running low,
// needs topping up, or has levels but no amount yet, grouped by location.

export const NEED_ORDER = { low: 0, below_par: 1, not_set_up: 2 };

/** "2 running low · 3 to top up · 1 no amount yet"; empty when nothing is needed. */
export function needCountText({ low, belowPar, noAmount }) {
  return [
    low ? `${low} running low` : '',
    belowPar ? `${belowPar} to top up` : '',
    noAmount ? `${noAmount} no amount yet` : '',
  ].filter(Boolean).join(' · ');
}

/**
 * locations: [{ id, name, is_active }]; rows: inventory_target_status rows.
 * Returns { groups: [{ id, name, rows, low, belowPar, noAmount }], clear: [names], totals }.
 * Groups are active locations with needs, by name; rows inside go running low first.
 */
export function groupAllNeeds(locations, rows) {
  const active = locations.filter((l) => l.is_active).sort((a, b) => a.name.localeCompare(b.name));
  const totals = { low: 0, belowPar: 0, noAmount: 0 };
  const groups = [];
  const clear = [];
  for (const location of active) {
    const needs = rows
      .filter((r) => r.location_id === location.id && r.status in NEED_ORDER)
      .sort((a, b) => NEED_ORDER[a.status] - NEED_ORDER[b.status] || a.item_name.localeCompare(b.item_name));
    if (!needs.length) {
      clear.push(location.name);
      continue;
    }
    const count = (s) => needs.filter((r) => r.status === s).length;
    const group = { id: location.id, name: location.name, rows: needs, low: count('low'), belowPar: count('below_par'), noAmount: count('not_set_up') };
    totals.low += group.low;
    totals.belowPar += group.belowPar;
    totals.noAmount += group.noAmount;
    groups.push(group);
  }
  return { groups, clear, totals };
}
