// Common container sizes, so people pick "Half barrel" or "750 ml" instead of doing math.
// Stored sizes are ml; a saved size that matches a preset is shown with the preset's name.

const GAL = 3785.41;

const PRESETS = {
  keg: [
    { key: 'half-barrel', label: 'Half barrel (15.5 gal)', ml: 15.5 * GAL, input: { content_size: '15.5', content_unit: 'gal' } },
    { key: 'quarter-barrel', label: 'Quarter barrel (7.75 gal)', ml: 7.75 * GAL, input: { content_size: '7.75', content_unit: 'gal' } },
    { key: 'sixtel', label: 'Sixtel (5.16 gal)', ml: (15.5 / 3) * GAL, input: { content_size: '5.16', content_unit: 'gal' } },
  ],
  bottle: [
    { key: '750ml', label: '750 ml', ml: 750, input: { content_size: '750', content_unit: 'ml' } },
    { key: '1l', label: '1 liter', ml: 1000, input: { content_size: '1', content_unit: 'l' } },
    { key: '1.75l', label: '1.75 liters', ml: 1750, input: { content_size: '1.75', content_unit: 'l' } },
    { key: '375ml', label: '375 ml', ml: 375, input: { content_size: '375', content_unit: 'ml' } },
    { key: '12oz', label: '12 oz', ml: 354.882, input: { content_size: '12', content_unit: 'fl_oz' } },
    { key: '16oz', label: '16 oz', ml: 473.176, input: { content_size: '16', content_unit: 'fl_oz' } },
  ],
};
const ALL = [...PRESETS.keg, ...PRESETS.bottle];

/** Presets that fit what the item is counted in: kegs for a keg, bottles and cans otherwise. */
export function presetsFor(unit) {
  return /keg|barrel/i.test(`${unit?.code || ''} ${unit?.name || ''}`) ? PRESETS.keg : PRESETS.bottle;
}

/** The preset a saved size matches (within 0.5%), or null. */
export function presetForMl(ml) {
  if (!(ml > 0)) return null;
  return ALL.find((p) => Math.abs(p.ml - ml) / p.ml < 0.005) || null;
}
