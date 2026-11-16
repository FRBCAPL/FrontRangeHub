// As-ordered prices per supplier: parse/format, compare, and which supplier the shopping list defaults to.

/** "$12.50", or "" when there is no price. */
export function formatPrice(price) {
  if (price == null || !(Number(price) > 0)) return '';
  const n = Number(price);
  return `$${n.toFixed(n % 1 === 0 ? 2 : Math.min(4, Math.max(2, String(n).split('.')[1]?.length || 2)))}`;
}

/**
 * Typed price text -> { price } (null when blank) or { error }.
 * Accepts 12, 12.5, $12.50.
 */
export function parsePrice(text) {
  const raw = String(text || '').trim().replace(/^\$/, '').replace(/,/g, '');
  if (!raw) return { price: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || !(n > 0) || n > 1000000) return { error: 'Price must be more than 0, or left empty.' };
  if (scaleOf(n) > 4) return { error: 'Keep the price to at most 4 decimal places.' };
  return { price: n };
}

const scaleOf = (n) => {
  const s = String(n);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
};

/**
 * Among `supplierIds`, the cheapest with a price; ties go to `mainId` when it is tied, else first.
 * No prices -> mainId (or null). `prices`: Map supplierId -> number.
 */
export function cheapestSupplierId(mainId, supplierIds, prices) {
  const ids = supplierIds || [];
  const priced = ids.filter((id) => prices?.get(id) != null && Number(prices.get(id)) > 0);
  if (!priced.length) return mainId || null;
  priced.sort((a, b) => Number(prices.get(a)) - Number(prices.get(b))
    || Number(b === mainId) - Number(a === mainId)
    || String(a).localeCompare(String(b)));
  return priced[0];
}

/**
 * Rows for compare / edit: [{ id, name, icon, isMain, price, code }], cheapest first, then
 * unpriced A to Z. `prices`: Map supplierId -> { price, code }.
 */
export function supplierPriceRows(suppliers, mainId, prices) {
  const rows = (suppliers || []).map((s) => {
    const saved = prices?.get(s.id);
    return {
      id: s.id,
      name: s.name,
      icon: s.icon || '',
      is_active: s.is_active !== false,
      isMain: s.id === mainId,
      price: saved?.price ?? null,
      code: saved?.code || '',
    };
  });
  return rows.sort((a, b) => {
    const ap = a.price != null ? 0 : 1;
    const bp = b.price != null ? 0 : 1;
    if (ap !== bp) return ap - bp;
    if (a.price != null && b.price != null && a.price !== b.price) return a.price - b.price;
    return Number(b.isMain) - Number(a.isMain) || a.name.localeCompare(b.name);
  });
}
