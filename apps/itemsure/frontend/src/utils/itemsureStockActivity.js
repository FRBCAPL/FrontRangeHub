/** Activity tab chips: group stock movements by what happened. */

export const ACTIVITY_KINDS = [
  { id: 'all', label: 'All', types: null },
  { id: 'clover', label: 'Clover sales', types: ['pos_sale'] },
  { id: 'received', label: 'Received', types: ['manual_addition', 'opening_balance'] },
  { id: 'used', label: 'Used', types: ['manual_removal'] },
  { id: 'moved', label: 'Moved', types: ['transfer_in', 'transfer_out'] },
  { id: 'counts', label: 'Counts', types: ['count_adjustment'] },
];

export function matchesActivityKind(movement, kindId) {
  if (!kindId || kindId === 'all') return true;
  const kind = ACTIVITY_KINDS.find((k) => k.id === kindId);
  return Boolean(kind?.types?.includes(movement.movement_type));
}

/** Counts per chip; only include kinds that have rows (plus All). */
export function activityKindCounts(rows) {
  const counts = { all: rows.length };
  for (const k of ACTIVITY_KINDS) {
    if (!k.types) continue;
    counts[k.id] = rows.filter((m) => k.types.includes(m.movement_type)).length;
  }
  return counts;
}

/** Clover take-off is system work — no need to show who posted it. */
export function showActivityActor(movement) {
  return movement.movement_type !== 'pos_sale';
}
