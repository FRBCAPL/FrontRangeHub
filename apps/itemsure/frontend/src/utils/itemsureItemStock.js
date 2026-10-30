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

/**
 * Items most in need of attention first: running low, needs topping up, no amount yet,
 * fine, no par set, then archived. Ties keep their order (by name).
 */
export function sortByAttention(items, summaryFor) {
  const rank = (item) => {
    if (!(item.is_active ?? item.isActive ?? true)) return 5;
    const status = summaryFor(item)?.status;
    return status ? STATUS_RANK[status] ?? 4 : 4;
  };
  return items.map((item) => ({ item, r: rank(item) })).sort((a, b) => a.r - b.r).map((x) => x.item);
}

const slotOf = (row) => `${row.location_id}|${row.storage_area_id || ''}`;

/**
 * The item+spot pairs actually in use, matching what an item's page shows: kept there,
 * levels set there, or stock other than 0 there. Keys are 'itemId|locationId|areaId' ('' for Loose).
 */
export function slotsInUse({ places = [], balances = [], targets = [] }) {
  const keys = new Set();
  const add = (row) => keys.add(`${row.item_id}|${slotOf(row)}`);
  places.forEach(add);
  targets.forEach(add);
  balances.filter((b) => canonicalQuantity(b.quantity_text) !== '0').forEach(add);
  return keys;
}

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

/**
 * Per location, each spot and how many are there:
 * [{ name: 'North', spots: [{ name: 'Bar', quantity: '4' }, { name: 'Loose', quantity: null }] }].
 * A location with only loose stock has one spot with name null.
 */
export function whereAmounts(groups) {
  return groups.map(({ location, slots }) => {
    const hasSpots = slots.some((s) => s.storageAreaId);
    const spots = slots
      .filter((s) => s.storageAreaId)
      .map((s) => ({ name: s.areaName, quantity: s.quantity }));
    for (const s of slots.filter((x) => !x.storageAreaId)) spots.push({ name: hasSpots ? 'Loose' : null, quantity: s.quantity });
    return { name: location.name, spots };
  });
}

/** Total on hand across the item's visible slots, and the status needing most attention. */
export function itemSummary(itemId, sources) {
  let total = null;
  let par = null;
  let minimum = null;
  const statuses = [];
  for (const group of itemSlots(itemId, sources)) {
    for (const slot of group.slots) {
      if (slot.quantity !== null) total = addQuantity(total, slot.quantity);
      if (slot.target?.par_text != null) par = addQuantity(par, slot.target.par_text);
      if (slot.target?.minimum_text != null) minimum = addQuantity(minimum, slot.target.minimum_text);
      statuses.push(slot.status);
    }
  }
  return { total, par, minimum, status: worstStatus(statuses) };
}
