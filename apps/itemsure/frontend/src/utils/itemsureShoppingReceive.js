// Receiving the shopping: how much was bought, and how it is shared out between places.
import { canonicalQuantity, checkQuantity, displayQuantity, sameQuantity } from './itemsureQuantity.js';
import { NO_AREA_LABEL } from './itemsureStock.js';
import { spotLabel } from './itemsureShoppingList.js';

const SCALE = 6;
const toScaled = (text) => {
  const [whole, fraction = ''] = displayQuantity(text).split('.');
  return BigInt(whole + fraction.padEnd(SCALE, '0'));
};
const fromScaled = (value) => {
  const digits = value.toString().padStart(SCALE + 1, '0');
  return canonicalQuantity(`${digits.slice(0, -SCALE)}.${digits.slice(-SCALE)}`);
};
const isNumber = (text) => Boolean(checkQuantity(text, SCALE).value);

/** What the shopper got: the amount they typed, or the list's amount. '' when neither is set. */
export function boughtAmount(row, tickAmount = '') {
  if (String(tickAmount || '').trim()) return String(tickAmount).trim();
  return row.extra ? row.amount || '' : row.total || '';
}

/** True when the shopper typed an amount that isn't what the list said. */
export function boughtDiffers(row, tickAmount = '') {
  const typed = String(tickAmount || '').trim();
  if (!typed) return false;
  const listed = row.extra ? row.amount || '' : row.total || '';
  if (isNumber(typed) && isNumber(listed)) return !sameQuantity(typed, listed);
  return typed !== listed;
}

/**
 * Shares `bought` out between a row's places ({ rec, amount } from the list), one amount
 * per place in the same order. Places running low are filled first, then the rest, each up
 * to what it needs. Anything left over goes to the place that needed the most (the first
 * place when none had a number). Returns '' for every place when `bought` isn't a number.
 */
export function splitBought(spots, bought) {
  if (!spots.length) return [];
  if (!isNumber(bought)) return spots.map(() => '');
  let left = toScaled(bought);
  const needs = spots.map((s) => (s.amount === null || s.amount === undefined || !isNumber(s.amount) ? 0n : toScaled(s.amount)));
  const given = spots.map(() => 0n);
  const order = spots.map((_, i) => i).sort((a, b) => (spots[a].rec.status === 'low' ? 0 : 1) - (spots[b].rec.status === 'low' ? 0 : 1) || a - b);
  for (const i of order) {
    const give = needs[i] < left ? needs[i] : left;
    given[i] = give;
    left -= give;
  }
  if (left > 0n) {
    const most = needs.reduce((best, need, i) => (need > needs[best] ? i : best), 0);
    given[most] += left;
  }
  return given.map(fromScaled);
}

/** A typed receive amount checked against the item's unit: { value } (may be '0'), { skip } when blank, or { error }. */
export function checkReceived(text, item) {
  const result = checkQuantity(text, item?.precision ?? 0, item?.unitName || 'This unit');
  if (result.empty) return { skip: true };
  if (result.error) return { error: result.error };
  return { value: result.value };
}

/**
 * Places an item already has stock set up at: [{ locationId, storageAreaId, label }],
 * labelled like the shopping list ("Bar", or "Legends · Bar" across locations).
 */
export function stockPlaces(balances, locations, itemId, withLocation) {
  const byId = new Map(locations.map((l) => [l.id, l]));
  return balances
    .filter((b) => b.item_id === itemId && byId.has(b.location_id))
    .map((b) => {
      const location = byId.get(b.location_id);
      const area = location.storageAreas?.find((a) => a.id === b.storage_area_id)?.name || '';
      const label = withLocation ? `${location.name} \u00b7 ${area || NO_AREA_LABEL}` : area || location.name;
      return { locationId: b.location_id, storageAreaId: b.storage_area_id, label };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** The reason saved with each stock change. */
export const receiveReason = (supplierName) => (supplierName ? `Delivery received from ${supplierName}`.slice(0, 200) : 'Shopping received');

/**
 * The receive screen's starting state, one entry per ticked row:
 * { key, row, take, bought, differs, places: [{ locationId, storageAreaId, label }], amounts, placeIndex }.
 * Item rows get their list places with the bought amount split between them. A hand-added
 * item gets the places it has stock at (pick one); a one-off line gets none and is just cleared.
 */
export function receiveEntries(rows, ticked, { placesFor = () => [], withLocation = false } = {}) {
  return rows
    .filter((row) => ticked.has(row.tick || row.itemId))
    .map((row) => {
      const key = row.tick || row.itemId;
      const typed = ticked.get(key)?.amount || '';
      const bought = boughtAmount(row, typed);
      const base = { key, row, take: true, bought, differs: boughtDiffers(row, typed), placeIndex: 0 };
      if (!row.extra) {
        const places = row.spots.map(({ rec }) => ({
          locationId: rec.location_id,
          storageAreaId: rec.storage_area_id,
          label: spotLabel(rec, withLocation),
        }));
        return { ...base, places, amounts: splitBought(row.spots, bought) };
      }
      const places = row.itemId ? placesFor(row.itemId) : [];
      return { ...base, places, amounts: places.length ? [isNumber(bought) ? displayQuantity(bought) : ''] : [] };
    });
}

/**
 * What to send for the entries being received: { lines, tickKeys, extraIds } or { error }.
 * Blank and zero amounts add nothing; every other amount must suit the item's unit.
 */
export function receivePayload(entries, { itemsById, supplierNameOf = () => '' }) {
  const lines = [];
  const taken = entries.filter((e) => e.take);
  for (const entry of taken) {
    const { row } = entry;
    const item = row.itemId ? itemsById.get(row.itemId) : null;
    const targets = row.extra ? entry.places.slice(entry.placeIndex, entry.placeIndex + 1) : entry.places;
    for (let i = 0; i < targets.length; i += 1) {
      const amount = row.extra ? entry.amounts[0] : entry.amounts[i];
      const result = checkReceived(amount, item);
      if (result.error) return { error: `${row.name}: ${result.error}` };
      if (result.skip || result.value === '0') continue;
      lines.push({
        locationId: targets[i].locationId,
        storageAreaId: targets[i].storageAreaId,
        itemId: row.itemId,
        quantity: result.value,
        reason: receiveReason(supplierNameOf(row.itemId)),
      });
    }
  }
  if (!taken.length) return { error: 'Choose at least one item to receive.' };
  return {
    lines,
    tickKeys: taken.map((e) => e.key),
    extraIds: taken.filter((e) => e.row.extra).map((e) => e.row.extraId),
  };
}
