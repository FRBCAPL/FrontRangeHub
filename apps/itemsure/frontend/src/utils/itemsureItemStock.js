// Per-item stock: the places an item lives, how many are there, and its levels.
// Quantities stay decimal strings; sums use exact integer math on the digits.
import { canonicalQuantity } from './itemsureQuantity.js';
import { targetKey, targetStatus } from './itemsureTargets.js';

/** Exact sum of two non-negative decimal strings. */
export function addQuantity(a, b) {
  const [aw, af = ''] = canonicalQuantity(a || '0').split('.');
  const [bw, bf = ''] = canonicalQuantity(b || '0').split('.');
  const scale = Math.max(af.length, bf.length);
  const total = BigInt(aw + af.padEnd(scale, '0')) + BigInt(bw + bf.padEnd(scale, '0'));
  if (scale === 0) return total.toString();
  const digits = total.toString().padStart(scale + 1, '0');
  const fraction = digits.slice(-scale).replace(/0+$/, '');
  return fraction ? `${digits.slice(0, -scale)}.${fraction}` : digits.slice(0, -scale);
}

const STATUS_RANK = { low: 0, below_par: 1, not_set_up: 2, above_minimum: 3, at_target: 3, above_target: 3 };

/** The status that needs the most attention, or null. */
export function worstStatus(statuses) {
  return statuses.filter(Boolean).sort((a, b) => STATUS_RANK[a] - STATUS_RANK[b])[0] || null;
}

const slotOf = (row) => `${row.location_id}|${row.storage_area_id || ''}`;

/**
 * Every place an item is kept, has stock, or has levels, grouped by location in
 * the locations' order. Places at locations the person can't see are left out.
 * Each slot: { locationId, storageAreaId, areaName, quantity (string|null), target, status, kept }.
 * kept = ticked under "Kept at"; other slots only show because stock or levels remain there.
 */
export function itemSlots(itemId, { places = [], balances = [], targets = [], locations = [] }) {
  const keys = new Set();
  for (const row of [...places, ...balances, ...targets]) if (row.item_id === itemId) keys.add(slotOf(row));
  const keptKeys = new Set(places.filter((p) => p.item_id === itemId).map(slotOf));
  const balanceBySlot = new Map(balances.filter((b) => b.item_id === itemId).map((b) => [slotOf(b), b]));
  const targetBySlot = new Map(targets.filter((t) => t.item_id === itemId).map((t) => [slotOf(t), t]));

  const groups = [];
  for (const location of locations) {
    const areas = [{ id: null, name: '' }, ...(location.storageAreas || [])];
    const slots = areas
      .filter((area) => keys.has(`${location.id}|${area.id || ''}`))
      .map((area) => {
        const key = `${location.id}|${area.id || ''}`;
        const balance = balanceBySlot.get(key) || null;
        const target = targetBySlot.get(key) || null;
        const quantity = balance ? canonicalQuantity(balance.quantity_text) : null;
        return { key: targetKey(itemId, location.id, area.id), locationId: location.id, storageAreaId: area.id, areaName: area.name, quantity, target, status: targetStatus(target, quantity), kept: keptKeys.has(key) };
      });
    if (slots.length) groups.push({ location, slots });
  }
  return groups;
}

const hasStock = (slot) => slot.quantity !== null && canonicalQuantity(slot.quantity) !== '0';

/**
 * The slots worth showing: stock on hand, levels set, or an old "Kept at" choice.
 * A place that is empty and has nothing set simply disappears.
 */
export function visibleSlots(itemId, sources) {
  return itemSlots(itemId, sources)
    .map((g) => ({ ...g, slots: g.slots.filter((s) => s.kept || s.target || hasStock(s)) }))
    .filter((g) => g.slots.length);
}

/** True when a slot holds nothing, so removing it loses no stock. */
export function isEmptySlot(slot) {
  return !hasStock(slot);
}

/** "Legends (Bar, Loose)" per location, for short lists. */
export function whereLabels(groups) {
  return groups.map(({ location, slots }) => {
    const spots = slots.filter((s) => s.storageAreaId).map((s) => s.areaName);
    if (!spots.length) return location.name;
    if (slots.some((s) => !s.storageAreaId)) spots.push('Loose');
    return `${location.name} (${spots.join(', ')})`;
  });
}

/** Total on hand across the item's visible slots, and the status needing most attention. */
export function itemSummary(itemId, sources) {
  let total = null;
  const statuses = [];
  for (const group of itemSlots(itemId, sources)) {
    for (const slot of group.slots) {
      if (slot.quantity !== null) total = addQuantity(total, slot.quantity);
      statuses.push(slot.status);
    }
  }
  return { total, status: worstStatus(statuses) };
}
