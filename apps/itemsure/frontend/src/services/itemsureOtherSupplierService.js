import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// Other suppliers an item can also be bought from ("Also from"), and the shopping
// list's "buying from X this trip" choice. The main supplier stays on the item.

/** Map of item id -> [supplier id], or null when the database update isn't applied yet. */
export async function listOtherSuppliers(organizationId) {
  const { data, error } = await itemsure
    .from('item_suppliers')
    .select('item_id, supplier_id')
    .eq('organization_id', organizationId);
  if (error) return null;
  const byItem = new Map();
  for (const row of data || []) byItem.set(row.item_id, [...(byItem.get(row.item_id) || []), row.supplier_id]);
  return byItem;
}

/** Makes the item's other suppliers exactly `wanted`, reading what is saved now so a retry is safe. */
export async function saveOtherSuppliers(organizationId, itemId, wanted) {
  const saved = assertOk(
    await itemsure.from('item_suppliers').select('supplier_id').eq('item_id', itemId),
    'other suppliers',
  ) || [];
  const have = new Set(saved.map((r) => r.supplier_id));
  const want = new Set(wanted);
  const add = [...want].filter((id) => !have.has(id));
  const drop = [...have].filter((id) => !want.has(id));
  if (add.length) {
    assertOk(
      await itemsure.from('item_suppliers').insert(add.map((supplierId) => ({ organization_id: organizationId, item_id: itemId, supplier_id: supplierId }))),
      'add other suppliers',
    );
  }
  if (drop.length) {
    assertOk(
      await itemsure.from('item_suppliers').delete().eq('item_id', itemId).in('supplier_id', drop),
      'remove other suppliers',
    );
  }
}

/** Map of item id -> supplier id chosen for this shopping trip, or null when the update isn't applied yet. */
export async function listTripSuppliers(organizationId) {
  const { data, error } = await itemsure
    .from('shopping_supplier_choices')
    .select('item_id, supplier_id')
    .eq('organization_id', organizationId);
  if (error) return null;
  return new Map((data || []).map((r) => [r.item_id, r.supplier_id]));
}

/** Resets the trip choice for these items. Items with no choice are fine, so a retry is safe. */
export async function clearTripSuppliers(organizationId, itemIds) {
  if (!itemIds.length) return;
  assertOk(
    await itemsure.from('shopping_supplier_choices').delete().eq('organization_id', organizationId).in('item_id', itemIds),
    'reset the supplier',
  );
}

/** Buys the item from `supplierId` this trip, replacing any earlier choice (including one made a moment ago by someone else). */
export async function setTripSupplier(organizationId, itemId, supplierId) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await clearTripSuppliers(organizationId, [itemId]);
    const { error } = await itemsure
      .from('shopping_supplier_choices')
      .insert({ organization_id: organizationId, item_id: itemId, supplier_id: supplierId });
    if (!error) return;
    if (error.code !== '23505') assertOk({ error }, 'change the supplier');
  }
  throw new Error('Someone else changed the supplier at the same time. Try again.');
}
