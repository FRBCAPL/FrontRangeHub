import { supabase } from '@shared/config/supabase.js';

export const GEAR_MISSING = 'Run supabase-migrations/consignment-new-gear-2026-11.sql in the Supabase SQL editor, then refresh.';

export const PRODUCT_SELECT = '*, variants:consignment_gear_variants(*)';

export function gearError(error, fallback) {
  if (/could not find|schema cache|does not exist/i.test(error?.message || '')) return new Error(GEAR_MISSING);
  return new Error(error?.message || fallback);
}

async function call(fn, args, fallback) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw gearError(error, fallback);
  return data;
}

export const sortVariants = (product) => ({
  ...product,
  variants: [...(product.variants || [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
});

/** Active products with their active options. Empty before the migration runs. */
export async function loadGearProducts() {
  const { data, error } = await supabase
    .from('consignment_gear_products')
    .select(PRODUCT_SELECT)
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('sort')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map(sortVariants);
}

export async function loadGearProduct(slug) {
  const { data, error } = await supabase
    .from('consignment_gear_products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw gearError(error, 'Could not load this product.');
  return data ? sortVariants(data) : null;
}

/** special: order it in instead of holding stock. Returns { id, kind, hold_until }. */
export const reserveGear = (variantId, qty, note, special = false) => call(
  'reserve_consignment_gear',
  { p_variant_id: variantId, p_qty: Number(qty), p_note: note || null, p_special: !!special },
  'Could not reserve this.',
);

export const cancelGearOrder = (orderId) => call('cancel_consignment_gear_order', { p_order_id: orderId }, 'Could not cancel.');

/** Empty before the migration runs. */
export async function loadMyGearOrders() {
  const { data, error } = await supabase.rpc('my_consignment_gear_orders');
  if (error) return [];
  return data || [];
}
