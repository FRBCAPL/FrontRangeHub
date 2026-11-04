// Clover sales page: what sold in a period, per ItemSure item and per unmatched Clover item.
// Read only; nothing here changes stock.
import { expectedUse } from './itemsurePosUsage.js';

export const PERIODS = { today: 'Today', yesterday: 'Yesterday', week: 'Last 7 days', month: 'Last 30 days', custom: 'Pick dates' };

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parseDay = (text) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** { from, to } (local midnights, `to` not included) for a PERIODS key; custom uses { from, to } as 'YYYY-MM-DD'. null if invalid. */
export function periodRange(key, now = new Date(), custom = {}) {
  const today = startOfDay(now);
  if (key === 'today') return { from: today, to: addDays(today, 1) };
  if (key === 'yesterday') return { from: addDays(today, -1), to: today };
  if (key === 'week') return { from: addDays(today, -6), to: addDays(today, 1) };
  if (key === 'month') return { from: addDays(today, -29), to: addDays(today, 1) };
  if (key === 'custom') {
    const from = parseDay(custom.from);
    const last = parseDay(custom.to);
    if (!from || !last || last < from) return null;
    return { from, to: addDays(last, 1) };
  }
  return null;
}

/** Map Clover item id -> total quantity sold, from hourly rows. */
export function salesTotals(hours) {
  const totals = new Map();
  for (const h of hours) totals.set(h.external_id, (totals.get(h.external_id) || 0) + Number(h.quantity || 0));
  return totals;
}

/**
 * One row per ItemSure item with sales: { itemId, name, unit, sold, used, complete, missingPour,
 * missingContent, buttons: [{ externalId, name, sold }] }, most sold first. `used` is in the item's
 * counted unit; `complete` is false when some sales have no amount (or size) set yet.
 * `mods` (from modifierUse) adds what modifiers used, with `modifiers` notes like "6 Double".
 */
export function itemSalesRows({ totals, links, pours, unitCodes, contents, pieces, itemsById, posNames, mods = new Map() }) {
  const use = expectedUse({ links, sold: totals, pours, unitCodes, contents, pieces });
  for (const itemId of mods.keys()) {
    if (!use.has(itemId)) use.set(itemId, { expected: 0, sold: 0, missingPour: [], missingContent: false });
  }
  const buttons = new Map();
  for (const [externalId, itemIds] of links) {
    const qty = totals.get(externalId) || 0;
    if (!(qty > 0)) continue;
    for (const itemId of itemIds) {
      buttons.set(itemId, [...(buttons.get(itemId) || []), { externalId, name: posNames.get(externalId) || 'Clover item', sold: qty }]);
    }
  }
  const rows = [];
  for (const [itemId, e] of use) {
    const item = itemsById.get(itemId);
    const m = mods.get(itemId);
    rows.push({
      itemId,
      name: item?.name || 'Item',
      unit: item?.unitName || '',
      sold: e.sold,
      used: e.expected + (m?.extra || 0),
      complete: !e.missingPour.length && !e.missingContent && !m?.incomplete,
      modifiers: m?.notes || [],
      missingPour: e.missingPour,
      missingContent: e.missingContent,
      buttons: (buttons.get(itemId) || []).sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name)),
    });
  }
  return rows.sort((a, b) => b.sold - a.sold || b.used - a.used || a.name.localeCompare(b.name));
}

/** Clover items that sold but aren't matched to any ItemSure item: [{ externalId, name, sold }], most sold first. */
export function unmatchedRows(totals, links, posNames) {
  const rows = [];
  for (const [externalId, sold] of totals) {
    if (!(sold > 0) || (links.get(externalId) || []).length) continue;
    rows.push({ externalId, name: posNames.get(externalId) || 'Clover item', sold });
  }
  return rows.sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name));
}
