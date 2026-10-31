// Helpers for business-defined "Counted in" units.

/** "Half Keg (1/2)" -> "half_keg_1_2". Empty when the name has no letters or digits. */
export function unitCode(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+/g, '')
    .slice(0, 60)
    .replace(/_+$/g, '');
}

/** An existing unit whose name, short name, or code matches what was typed. */
export function findUnit(units, name) {
  const typed = String(name || '').trim().toLowerCase();
  if (!typed) return null;
  const code = unitCode(typed);
  return units.find((u) =>
    u.name?.toLowerCase() === typed || u.symbol?.toLowerCase() === typed || u.code === code) || null;
}

/**
 * Units split for the "Counted in" window: the business's own, the standard ones its items
 * already use (plus the chosen one), and the rest, which start hidden. With nothing to show
 * up front, every standard unit counts as in use so the window is never empty.
 */
export function unitSections(units, items, value) {
  const used = new Set(items.map((i) => i.base_unit_id));
  if (value) used.add(value);
  const own = units.filter((u) => u.organization_id);
  const shared = units.filter((u) => !u.organization_id);
  const inUse = shared.filter((u) => used.has(u.id));
  if (!own.length && !inUse.length) return { own, inUse: shared, more: [] };
  return { own, inUse, more: shared.filter((u) => !used.has(u.id)) };
}

/** Loaded units plus any added since, without duplicates. */
export function mergeUnits(units, added) {
  const known = new Set(units.map((u) => u.id));
  return [...units, ...added.filter((u) => !known.has(u.id))];
}
