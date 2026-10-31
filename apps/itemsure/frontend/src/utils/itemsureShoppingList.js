// The shopping list: restock suggestions turned into "what to buy, from whom" and "what to move".
import { addQuantity } from './itemsureItemStock.js';
import { displayQuantity, wholeToBuy } from './itemsureQuantity.js';
import { NO_AREA_LABEL } from './itemsureStock.js';

export const NO_SUPPLIER = 'No supplier';

const STATUS_RANK = { low: 0, below_par: 1 };
const isZero = (text) => displayQuantity(text) === '0';

/**
 * What one place still needs from outside: { amount, upTo } or null when nothing is to
 * be bought. `amount` null means no "Fill up to" number, so no suggested amount.
 * With moving off (`showMoves` false) the whole need is bought.
 */
export function buyFor(rec, showMoves) {
  if (rec.need === null) return { amount: null, upTo: false };
  if (!showMoves) return isZero(rec.need) ? null : { amount: rec.need, upTo: false };
  if (rec.external !== null) return isZero(rec.external) ? null : { amount: rec.external, upTo: false };
  return isZero(rec.external_at_most) ? null : { amount: rec.external_at_most, upTo: true };
}

/** Place label for one suggestion: "Bar", or "Legends · Bar" when places span locations. */
export const spotLabel = (rec, withLocation) =>
  withLocation ? `${rec.location_name} \u00b7 ${rec.area_name || NO_AREA_LABEL}` : rec.area_name || rec.location_name || NO_AREA_LABEL;

/**
 * Buy rows grouped by `groupOf(rec)` (supplier by default). Within a group, one row per
 * item adds up its places: { key, itemId, name, unit, status, total, upTo, missingPar, spots }.
 * `total` is rounded up to whole units. Groups and rows are most urgent first, then by name;
 * the "No supplier" group (or whatever `lastGroup` names) goes last.
 */
export function buyGroups(recs, { showMoves = true, groupOf, lastGroup = NO_SUPPLIER } = {}) {
  const groups = new Map();
  for (const rec of recs) {
    const buy = buyFor(rec, showMoves);
    if (!buy) continue;
    const label = groupOf(rec);
    if (!groups.has(label)) groups.set(label, new Map());
    const rows = groups.get(label);
    const row = rows.get(rec.item_id) || {
      key: `${label}|${rec.item_id}`,
      itemId: rec.item_id,
      name: rec.item_name,
      unit: rec.unit_symbol,
      status: rec.status,
      exact: null,
      upTo: false,
      missingPar: false,
      spots: [],
    };
    if (STATUS_RANK[rec.status] < STATUS_RANK[row.status]) row.status = rec.status;
    if (buy.amount === null) row.missingPar = true;
    else row.exact = addQuantity(row.exact, buy.amount);
    row.upTo = row.upTo || buy.upTo;
    row.spots.push({ rec, amount: buy.amount, upTo: buy.upTo });
    rows.set(rec.item_id, row);
  }

  const byUrgency = (a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) || a.name.localeCompare(b.name);
  return [...groups.entries()]
    .map(([label, rows]) => ({
      label,
      rows: [...rows.values()].map(({ exact, ...row }) => ({ ...row, total: exact === null ? null : wholeToBuy(exact) })).sort(byUrgency),
    }))
    .sort((a, b) => (a.label === lastGroup) - (b.label === lastGroup) || a.label.localeCompare(b.label));
}

/** Every suggested move: { key, rec, move }, most urgent first. */
export function moveRows(recs, showMoves = true) {
  if (!showMoves) return [];
  return recs
    .flatMap((rec) => rec.transfers.filter((t) => !t.hidden).map((move) => ({ key: `${rec.target_id}|${move.location_id}|${move.storage_area_id || ''}`, rec, move })))
    .sort((a, b) => (STATUS_RANK[a.rec.status] ?? 9) - (STATUS_RANK[b.rec.status] ?? 9) || a.rec.item_name.localeCompare(b.rec.item_name));
}

/** "Buy 3 btl", "Buy up to 4 cs", or "Amount not set". */
export function buyLabel(row) {
  if (row.total === null) return 'Amount not set';
  return `${row.upTo ? 'Up to ' : ''}${row.total} ${row.unit}`;
}

/** Plain text to paste into a message: one block per group, ticked rows left out. */
export function shoppingText(groups, ticked = new Set()) {
  return groups
    .map((g) => {
      const lines = g.rows.filter((r) => !ticked.has(r.itemId)).map((r) => `- ${r.name}: ${buyLabel(r)}`);
      return lines.length ? `${g.label}\n${lines.join('\n')}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
}
