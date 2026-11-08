/**
 * Admin product editor: options are edited as rows of values lined up with option names
 * (so renaming "Weight" doesn't lose values), then turned back into { name: value } on save.
 */

export const MAX_OPTION_NAMES = 3;

export const blankRow = (count, from = null) => ({
  id: null,
  values: from ? [...from.values] : Array(count).fill(''),
  sku: '',
  price: '',
  stock: '0',
  active: true,
});

export function toEditorRows(product) {
  const names = product?.option_names || [];
  const rows = (product?.variants || []).map((v) => ({
    id: v.id,
    values: names.map((n) => v.options?.[n] ?? ''),
    sku: v.sku || '',
    price: v.price == null ? '' : String(v.price),
    stock: String(v.stock ?? 0),
    active: v.active !== false,
  }));
  return rows.length ? rows : [blankRow(names.length)];
}

const clean = (s) => String(s ?? '').trim();

/** Returns an error message, or null when the product and its options can be saved. */
export function gearFormError(form, optionNames, rows) {
  if (clean(form.name).length < 2) return 'Give the product a name.';
  if (!(Number(form.price) > 0)) return 'Enter a price above $0.';
  if (clean(form.msrp) && !(Number(form.msrp) > 0)) return 'MSRP must be above $0, or leave it blank.';
  const names = optionNames.map(clean);
  if (names.some((n) => !n)) return 'Name every option (for example Weight), or remove the empty one.';
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return 'Each option needs a different name.';
  if (!rows.length) return 'Add at least one row.';
  if (!names.length && rows.length > 1) return 'A product without options has one row. Add an option (like Weight) for more.';
  const combos = new Set();
  for (const [i, r] of rows.entries()) {
    const label = `Row ${i + 1}`;
    if (names.some((_, j) => !clean(r.values[j]))) return `${label}: fill in every option.`;
    if (clean(r.price) && !(Number(r.price) > 0)) return `${label}: price must be above $0, or leave it blank to use the product price.`;
    if (!/^\d+$/.test(clean(r.stock))) return `${label}: stock must be a whole number (0 or more).`;
    const key = names.map((_, j) => clean(r.values[j]).toLowerCase()).join('|');
    if (combos.has(key)) return `${label} repeats another row’s options.`;
    combos.add(key);
  }
  return null;
}

/** Variant rows ready for saveGearProduct. */
export function fromEditorRows(optionNames, rows) {
  const names = optionNames.map(clean);
  return rows.map((r) => ({
    ...(r.id ? { id: r.id } : {}),
    options: Object.fromEntries(names.map((n, j) => [n, clean(r.values[j])])),
    sku: clean(r.sku) || null,
    price: clean(r.price) ? Number(r.price) : null,
    stock: Number(clean(r.stock)),
    active: !!r.active,
  }));
}
