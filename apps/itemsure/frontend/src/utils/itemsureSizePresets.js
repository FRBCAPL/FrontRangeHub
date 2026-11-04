// Common container sizes, so people pick "Half barrel" or "750 ml" instead of doing math.
// Stored sizes are ml; a saved size that matches a preset is shown with the preset's name.

import { kindOf } from './itemsureCategoryKind.js';

const GAL = 3785.41;
const OZ = 29.5735;
const oz = (n) => ({ key: `${n}oz`, label: `${n} oz`, ml: Math.round(n * OZ * 1000) / 1000, input: { content_size: String(n), content_unit: 'fl_oz' } });
const ml = (n, label = `${n} ml`) => ({ key: `${n}ml`, label, ml: n, input: { content_size: String(n), content_unit: 'ml' } });
const liters = (n) => ({ key: `${n}l`, label: `${n} ${n === 1 ? 'liter' : 'liters'}`, ml: n * 1000, input: { content_size: String(n), content_unit: 'l' } });

const PRESETS = {
  keg: [
    { key: 'half-barrel', label: 'Half barrel (15.5 gal)', ml: 15.5 * GAL, input: { content_size: '15.5', content_unit: 'gal' } },
    { key: 'quarter-barrel', label: 'Quarter barrel (7.75 gal)', ml: 7.75 * GAL, input: { content_size: '7.75', content_unit: 'gal' } },
    { key: 'sixtel', label: 'Sixtel (5.16 gal)', ml: (15.5 / 3) * GAL, input: { content_size: '5.16', content_unit: 'gal' } },
  ],
  liquor: [ml(750), liters(1), liters(1.75), ml(375), ml(50)],
  wine: [ml(750), liters(1.5), liters(3), ml(187)],
  packaged: [oz(12), oz(16), oz(19.2), oz(22), oz(24), oz(25)],
  bottle: [ml(750), liters(1), liters(1.75), ml(375), oz(12), oz(16)],
};
const ALL = [...PRESETS.keg, ...PRESETS.bottle, ...PRESETS.liquor, ...PRESETS.wine, ...PRESETS.packaged];

/**
 * Presets that fit the item: kegs for a keg, then by what the name says (`hint`: item or
 * category names) liquor, wine, or beer/soda bottles and cans. Otherwise common bottles.
 */
export function presetsFor(unit, hint = '') {
  if (/keg|barrel/i.test(`${unit?.code || ''} ${unit?.name || ''}`)) return PRESETS.keg;
  const kind = kindOf(hint, unit);
  if (kind === 'draft') return PRESETS.keg;
  return PRESETS[kind] || PRESETS.bottle;
}

/** The preset a saved size matches (within 0.5%), or null. */
export function presetForMl(value) {
  if (!(value > 0)) return null;
  return ALL.find((p) => Math.abs(p.ml - value) / p.ml < 0.005) || null;
}
