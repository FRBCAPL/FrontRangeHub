// Sales vs counts: turns Clover sales and pour sizes into "how much stock the sales should
// have used", in each item's counted unit, to set beside what counts say was used.

export const FL_OZ_ML = 29.5735;
/** ml in one of each volume unit ItemSure ships with. */
export const VOLUME_ML = { milliliter: 1, liter: 1000, gallon: 3785.41 };
export const POUR_UNITS = { fl_oz: 'oz', ml: 'ml', base: '', piece: '' };

const HOUR = 3600 * 1000;
const HALF_HOUR = HOUR / 2;
const floorHour = (ms) => Math.floor(ms / HOUR) * HOUR;

/** True when turning this pour into the item's unit needs "how much one holds" (e.g. oz from a bottle). */
export function needsContent(pour, unitCode) {
  return Boolean(pour) && pour.unit !== 'base' && pour.unit !== 'piece' && !VOLUME_ML[unitCode];
}

/** True when the pour is singles out of a case (or pack), so "how many in one" is needed. */
export const needsPieces = (pour) => pour?.unit === 'piece';

/**
 * How much of the item's counted unit one sale uses, or null when the bottle size (oz/ml) or
 * the count in one case (singles) is missing.
 */
export function pourInBase(pour, unitCode, contentMl, pieces) {
  if (!pour || !(pour.amount > 0)) return null;
  if (pour.unit === 'base') return pour.amount;
  if (pour.unit === 'piece') return pieces > 0 ? pour.amount / pieces : null;
  const ml = pour.unit === 'fl_oz' ? pour.amount * FL_OZ_ML : pour.amount;
  if (VOLUME_ML[unitCode]) return ml / VOLUME_ML[unitCode];
  return contentMl > 0 ? ml / contentMl : null;
}

/**
 * Expected use per item. links: Map cloverId -> [itemId]; sold: Map cloverId -> quantity;
 * pours: Map "cloverId|itemId" -> { amount, unit }; unitCodes / contents / pieces: Map itemId ->
 * code / ml / singles in one.
 * Returns Map itemId -> { expected, sold, missingPour: [cloverId], missingContent }.
 */
export function expectedUse({ links, sold, pours, unitCodes, contents, pieces }) {
  const out = new Map();
  const soldFor = typeof sold === 'function' ? sold : (cloverId) => sold.get(cloverId) || 0;
  for (const [cloverId, itemIds] of links) {
    for (const itemId of itemIds) {
      const qty = soldFor(cloverId, itemId);
      if (!(qty > 0)) continue;
      const row = out.get(itemId) || { expected: 0, sold: 0, missingPour: [], missingContent: false };
      row.sold += qty;
      const pour = pours?.get(`${cloverId}|${itemId}`);
      const per = pour ? pourInBase(pour, unitCodes.get(itemId), contents?.get(itemId), pieces?.get(itemId)) : null;
      if (!pour) row.missingPour.push(cloverId);
      else if (per == null) row.missingContent = true;
      else row.expected += qty * per;
      out.set(itemId, row);
    }
  }
  return out;
}

/** Report rows: every item counted in both counts, plus items with sales that weren't. */
export function usageRows(countRows, expected, itemsById) {
  const rows = countRows.map((c) => {
    const e = expected.get(c.item_id);
    const counted = Number(c.used);
    return {
      itemId: c.item_id,
      name: c.item_name,
      unit: c.unit_symbol || c.unit_name || '',
      counted,
      expected: e ? e.expected : 0,
      sold: e ? e.sold : 0,
      difference: e ? counted - e.expected : null,
      missingPour: e ? e.missingPour : [],
      missingContent: e ? e.missingContent : false,
      notCounted: false,
    };
  });
  const seen = new Set(countRows.map((c) => c.item_id));
  for (const [itemId, e] of expected) {
    if (seen.has(itemId)) continue;
    const item = itemsById.get(itemId);
    rows.push({
      itemId,
      name: item?.name || 'Item',
      unit: item?.unitName || '',
      counted: null,
      expected: e.expected,
      sold: e.sold,
      difference: null,
      missingPour: e.missingPour,
      missingContent: e.missingContent,
      notCounted: true,
    });
  }
  return rows.sort((a, b) => Number(a.notCounted) - Number(b.notCounted) || a.name.localeCompare(b.name));
}

/** Sales hours that belong between two counts: those whose middle falls after the first and by the second. */
export function salesHourRange(fromAt, toAt) {
  return {
    after: new Date(Date.parse(fromAt) - HALF_HOUR).toISOString(),
    upTo: new Date(Date.parse(toAt) - HALF_HOUR).toISOString(),
  };
}

/** True when one past "bring in sales" already covers every hour the report needs. */
export function salesCovered(syncs, fromAt, toAt) {
  const needFrom = floorHour(Date.parse(fromAt));
  const needTo = floorHour(Date.parse(toAt) - HALF_HOUR) + HOUR;
  return (syncs || []).some((s) => Date.parse(s.from_at) <= needFrom && Date.parse(s.to_at) >= needTo);
}

/**
 * Approved counts grouped into rounds, one per day (spots are often counted one at a time):
 * newest first, [{ key, day, names, endAt }]. endAt is when the round's last count was approved.
 */
export function countRounds(counts) {
  const byDay = new Map();
  for (const c of counts) {
    const d = new Date(c.at);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const round = byDay.get(key) || { key, day: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }), names: [], endAt: c.decidedAt };
    round.names.push(c.name);
    if (Date.parse(c.decidedAt) > Date.parse(round.endAt)) round.endAt = c.decidedAt;
    byDay.set(key, round);
  }
  return [...byDay.values()].sort((a, b) => Date.parse(b.endAt) - Date.parse(a.endAt));
}

/** soldFor(cloverId, from, to): sales in hours whose middle falls after `from` and by `to`. */
export function salesIndex(hours) {
  const byItem = new Map();
  for (const h of hours) {
    const list = byItem.get(h.external_id) || [];
    list.push([Date.parse(h.hour_start) + HALF_HOUR, Number(h.quantity)]);
    byItem.set(h.external_id, list);
  }
  return (cloverId, fromAt, toAt) => {
    const from = Date.parse(fromAt);
    const to = Date.parse(toAt);
    let total = 0;
    for (const [mid, q] of byItem.get(cloverId) || []) if (mid > from && mid <= to) total += q;
    return total;
  };
}

/** Short number for the table: up to 2 decimals, no trailing zeros. */
export function shortQty(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return String(Math.round(n * 100) / 100);
}
