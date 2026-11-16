import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { parsePrice } from '../utils/itemsureSupplierPrices.js';

/**
 * As-ordered prices per item+supplier for the business.
 * Map itemId -> Map(supplierId -> { price: number|null, code: string }), or null when the
 * database update isn't applied yet.
 */
export async function listSupplierPrices(organizationId) {
  const { data, error } = await itemsure
    .from('item_supplier_prices')
    .select('item_id, supplier_id, price, supplier_code')
    .eq('organization_id', organizationId);
  if (error) return null;
  const byItem = new Map();
  for (const row of data || []) {
    if (!byItem.has(row.item_id)) byItem.set(row.item_id, new Map());
    byItem.get(row.item_id).set(row.supplier_id, {
      price: row.price == null ? null : Number(row.price),
      code: row.supplier_code || '',
    });
  }
  return byItem;
}

/**
 * Saves or clears one supplier's price and product code for an item.
 * Blank price + blank code clears the row. `priceText` is what the person typed.
 */
export async function saveSupplierPrice(organizationId, itemId, supplierId, { priceText = '', code = '' } = {}) {
  const parsed = parsePrice(priceText);
  if (parsed.error) throw new Error(parsed.error);
  const trimmed = String(code || '').trim();
  if (trimmed.length > 80) throw new Error('Keep the supplier\'s product code under 80 characters.');
  assertOk(
    await itemsure.rpc('save_item_supplier_price', {
      p_organization: organizationId,
      p_item: itemId,
      p_supplier: supplierId,
      p_price: parsed.price,
      p_supplier_code: trimmed,
    }),
    'save the supplier price',
  );
}
