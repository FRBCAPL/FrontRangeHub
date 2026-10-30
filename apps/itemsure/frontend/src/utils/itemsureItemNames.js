// Item names are unique per business, ignoring case and extra spaces.
// Mirrors itemsure.item_name_key in the database.

export function itemNameKey(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** The name an archived item would get to free its own: "Well Rum (archived 1)", lowest free number. */
export function archivedName(items, item) {
  const base = String(item.name || '').trim().replace(/\s*\(archived \d+\)$/, '');
  const taken = new Set(items.filter((i) => i.id !== item.id).map((i) => itemNameKey(i.name)));
  let n = 1;
  while (taken.has(itemNameKey(`${base} (archived ${n})`))) n += 1;
  return `${base} (archived ${n})`;
}

/**
 * Another item already using this name, or null. `itemId` is the item being edited;
 * keeping its own name is always fine, even if an older duplicate exists.
 */
export function findNameClash(items, name, { itemId = null, originalName = null } = {}) {
  const key = itemNameKey(name);
  if (!key) return null;
  if (itemId && originalName !== null && key === itemNameKey(originalName)) return null;
  const other = items.find((i) => i.id !== itemId && itemNameKey(i.name) === key);
  return other ? { item: other, archived: !other.is_active } : null;
}
