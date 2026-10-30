// Brand and the second item detail. The second one's name is chosen per business
// (organizations.variant_label); until then it follows the industry.

export const VARIANT_LABEL_CHOICES = ['Model', 'Style', 'Variety', 'Flavor', 'Size', 'Part number', 'Vintage'];

const INDUSTRY_DEFAULTS = {
  hospitality: 'Style',
  retail: 'Model',
  warehouse: 'Part number',
  service: 'Model',
  general: 'Model',
};

export function defaultVariantLabel(industryType) {
  return INDUSTRY_DEFAULTS[industryType] || 'Model';
}

/** What this business calls the second detail. */
export function variantLabelFor(organization) {
  const own = String(organization?.variantLabel || '').trim();
  return own || defaultVariantLabel(organization?.industryType);
}

/** "Bacardi · Spiced", "Bacardi", "Spiced", or ''. */
export function detailsLine(item) {
  return [item?.brand, item?.variant].map((v) => String(v || '').trim()).filter(Boolean).join(' \u00b7 ');
}

/** Brands already used in the business, one spelling each, A to Z. */
export function knownBrands(items) {
  const byKey = new Map();
  for (const item of items) {
    const brand = String(item.brand || '').trim();
    if (brand && !byKey.has(brand.toLowerCase())) byKey.set(brand.toLowerCase(), brand);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/** The existing spelling of a typed brand ("bacardi" -> "Bacardi"), or the typed text trimmed. */
export function matchBrand(brands, typed) {
  const clean = String(typed || '').trim().replace(/\s+/g, ' ');
  return brands.find((b) => b.toLowerCase() === clean.toLowerCase()) || clean;
}
