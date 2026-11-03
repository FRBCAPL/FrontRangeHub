/**
 * The supplier an item is listed under on the shopping list: this trip's choice while it is
 * still one of the item's suppliers, otherwise the main supplier (or null).
 */
export function tripSupplierId(choice, mainId, supplierIds) {
  return choice && supplierIds.includes(choice) ? choice : mainId || null;
}

/** Item ids behind tick keys (hand-added "extra:" lines have no trip choice). */
export function itemIdsOfTicks(keys) {
  return keys.filter((k) => !String(k).startsWith('extra:'));
}
