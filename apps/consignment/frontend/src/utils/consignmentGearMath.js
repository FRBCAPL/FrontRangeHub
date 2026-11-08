/** New gear: prices, stock and option picking for products with variants. */

export const GEAR_MAX_QTY = 5;

const money = (n) => Math.round(Number(n || 0) * 100) / 100;

export const activeVariants = (product) => (product?.variants || []).filter((v) => v.active !== false);

export const variantPrice = (product, variant) => money(variant?.price ?? product?.price);

/** { min, max } across active variants (product price when there are none). */
export function priceRange(product) {
  const prices = activeVariants(product).map((v) => variantPrice(product, v));
  if (!prices.length) return { min: money(product?.price), max: money(product?.price) };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export const productStock = (product) => activeVariants(product).reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0);

/** Card / page badge: in_stock | special | sold_out. */
export function availability(product, variant = null) {
  const stock = variant ? Math.max(0, Number(variant.stock) || 0) : productStock(product);
  if (stock > 0) return 'in_stock';
  return product?.special_order ? 'special' : 'sold_out';
}

export const AVAILABILITY_LABELS = { in_stock: 'In stock', special: 'Special order', sold_out: 'Sold out' };

/** Distinct values for one option, in variant order. */
export function optionValues(product, name) {
  const seen = [];
  for (const v of activeVariants(product)) {
    const value = v.options?.[name];
    if (value != null && value !== '' && !seen.includes(value)) seen.push(value);
  }
  return seen;
}

/** The active variant matching every chosen option, or null. */
export function findVariant(product, chosen) {
  const names = product?.option_names || [];
  return activeVariants(product).find((v) => names.every((n) => (v.options?.[n] ?? '') === (chosen?.[n] ?? ''))) || null;
}

/** First in-stock variant's options (else the first variant's), to preselect on the product page. */
export function defaultChoice(product) {
  const list = activeVariants(product);
  const pick = list.find((v) => Number(v.stock) > 0) || list[0];
  return { ...(pick?.options || {}) };
}

export function optionLabel(product, options) {
  return (product?.option_names || []).map((n) => options?.[n]).filter((x) => x != null && x !== '').join(' · ');
}

export const GEAR_STATUS_LABELS = {
  held: 'Reserved: pick up at Legends',
  requested: 'Special order received',
  ordered: 'Ordered from supplier',
  ready: 'Arrived: pick up at Legends',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
  expired: 'Hold ended',
};

export const gearStatusLabel = (status) => GEAR_STATUS_LABELS[status] || status;

export const isOpenGearOrder = (order) => ['held', 'requested', 'ordered', 'ready'].includes(order?.status);

/** Buyers can cancel until FRPL has ordered it from the supplier. */
export const canBuyerCancel = (order) => ['held', 'requested', 'ready'].includes(order?.status);

export const orderTotal = (order) => money(Number(order?.price_each || 0) * Number(order?.qty || 0));
