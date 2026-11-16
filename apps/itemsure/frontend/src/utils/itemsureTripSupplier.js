import { cheapestSupplierId } from './itemsureSupplierPrices.js';

/**
 * The supplier an item is listed under on the shopping list: this trip's choice while it is
 * still one of the item's suppliers; otherwise the cheapest priced one, or the main supplier
 * when none are priced (or `prices` is not loaded yet).
 * `prices`: Map supplierId -> number, or null.
 */
export function tripSupplierId(choice, mainId, supplierIds, prices = null) {
  const ids = supplierIds || [];
  if (choice && ids.includes(choice)) return choice;
  return cheapestSupplierId(mainId, ids, prices);
}

/** Item ids behind tick keys (hand-added "extra:" lines have no trip choice). */
export function itemIdsOfTicks(keys) {
  return keys.filter((k) => !String(k).startsWith('extra:'));
}
