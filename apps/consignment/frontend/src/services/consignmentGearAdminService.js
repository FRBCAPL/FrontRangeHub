import { supabase } from '@shared/config/supabase.js';
import { PRODUCT_SELECT, gearError, sortVariants } from './consignmentGearService.js';

/** Every product (draft, active, archived) with all its options. Admin only. */
export async function loadGearProductsAdmin() {
  const { data, error } = await supabase
    .from('consignment_gear_products')
    .select(PRODUCT_SELECT)
    .order('status')
    .order('sort')
    .order('created_at', { ascending: false });
  if (error) throw gearError(error, 'Could not load products.');
  return (data || []).map(sortVariants);
}

const PRODUCT_FIELDS = ['name', 'brand', 'category', 'description', 'photo_urls', 'price', 'msrp', 'option_names', 'special_order', 'lead_time', 'status', 'featured', 'sort'];
const VARIANT_FIELDS = ['options', 'sku', 'price', 'stock', 'active', 'sort'];

const pick = (row, fields) => Object.fromEntries(fields.filter((f) => row[f] !== undefined).map((f) => [f, row[f]]));

/**
 * Saves the product, then its options. variants: rows (id present = existing). removedIds: variants to delete.
 * Returns the saved product id.
 */
export async function saveGearProduct(product, variants, removedIds = []) {
  const fields = pick(product, PRODUCT_FIELDS);
  const res = product.id
    ? await supabase.from('consignment_gear_products').update(fields).eq('id', product.id).select('id').single()
    : await supabase.from('consignment_gear_products').insert(fields).select('id').single();
  if (res.error) throw gearError(res.error, 'Could not save the product.');
  const productId = res.data.id;

  if (removedIds.length) {
    const { error } = await supabase.from('consignment_gear_variants').delete().in('id', removedIds);
    if (error) throw gearError(error, 'Could not remove an option.');
  }
  for (const [i, v] of variants.entries()) {
    const row = { ...pick(v, VARIANT_FIELDS), sort: i, product_id: productId, updated_at: new Date().toISOString() };
    const { error } = v.id
      ? await supabase.from('consignment_gear_variants').update(row).eq('id', v.id)
      : await supabase.from('consignment_gear_variants').insert(row);
    if (error) throw gearError(error, 'Could not save an option.');
  }
  return productId;
}

/** scope: open | all (last 90 days). */
export async function loadGearOrdersAdmin(scope = 'open') {
  const { data, error } = await supabase.rpc('admin_consignment_gear_orders', { p_scope: scope });
  if (error) throw gearError(error, 'Could not load reservations.');
  return data || [];
}

/** action: ordered | ready | picked_up | extend | cancel */
export async function updateGearOrder(orderId, action, note = '') {
  const { data, error } = await supabase.rpc('admin_update_consignment_gear_order', {
    p_order_id: orderId, p_action: action, p_note: note || null,
  });
  if (error) throw gearError(error, 'Could not update the reservation.');
  return data;
}
