// "One bottle holds ..." on the item form: typed amount + unit <-> ml stored in item_contents.

import { FL_OZ_ML, VOLUME_ML } from './itemsurePosUsage.js';
import { presetForMl } from './itemsureSizePresets.js';
import { isGroupUnit } from './itemsureCategoryKind.js';

export const CONTENT_UNITS = {
  ml: { label: 'ml', ml: 1 },
  l: { label: 'liters', ml: 1000 },
  fl_oz: { label: 'oz', ml: FL_OZ_ML },
  gal: { label: 'gallons', ml: 3785.41 },
};
const MAX_ML = 1000000;

/** Asking makes no sense when the item is already counted in a volume (ml, liters, gallons). */
export const asksContent = (unitCode) => !VOLUME_ML[unitCode];

const CONTAINER_UNIT = /\b(bottles?|btls?|kegs?|barrels?|cans?|jugs?|carafes?|growlers?|jars?|pitchers?|fifths?|handles?|tanks?|tins?)\b/i;

/**
 * What the item form asks, from what it's counted in: 'size' for containers ("One bottle holds
 * 750 ml"), 'pieces' for cases, packs and boxes ("One case has 24"), else null (each, pounds, liters…).
 */
export function unitAsks(unit) {
  if (!unit || VOLUME_ML[unit.code]) return null;
  if (isGroupUnit(unit)) return 'pieces';
  return CONTAINER_UNIT.test(`${unit.code || ''} ${unit.name || ''}`.replace(/[-_]/g, ' ')) ? 'size' : null;
}

/** { pieces } for a typed "One case has" ('' -> null), or { error }. */
export function checkPieces(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return { pieces: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) return { error: 'How many are in one should be a number above 0.' };
  return { pieces: n };
}

/** { ml } for a typed size ('' -> null), or { error }. */
export function checkContent(text, unit) {
  const raw = String(text ?? '').trim();
  if (!raw) return { ml: null };
  const n = Number(raw);
  const factor = CONTENT_UNITS[unit]?.ml;
  if (!factor || !Number.isFinite(n) || n <= 0) return { error: 'The size must be a number above 0.' };
  const ml = Math.round(n * factor * 1000) / 1000;
  if (ml > MAX_ML) return { error: 'That size is too big.' };
  return { ml };
}

/** n when it is a multiple of `step` (sizes are stored to 0.001 ml), else null. */
const roundTo = (n, step) => {
  const r = Math.round(n / step) * step;
  return r > 0 && Math.abs(n - r) < 0.0005 ? Number(r.toFixed(3)) : null;
};

/**
 * Starting text for the form, in the unit it was most likely typed in: a common size (preset),
 * whole liters, whole or half oz, quarter gallons, else ml.
 */
export function contentForm(ml) {
  if (!(ml > 0)) return { content_size: '', content_unit: 'ml' };
  const preset = presetForMl(ml);
  if (preset) return { ...preset.input };
  if (ml >= 1000 && ml % 1000 === 0) return { content_size: String(ml / 1000), content_unit: 'l' };
  if (ml % 1 !== 0) {
    const oz = roundTo(ml / FL_OZ_ML, 0.5);
    if (oz && oz < 256) return { content_size: String(oz), content_unit: 'fl_oz' };
    const gal = roundTo(ml / CONTENT_UNITS.gal.ml, 0.25);
    if (gal) return { content_size: String(gal), content_unit: 'gal' };
  }
  return { content_size: String(Math.round(ml * 1000) / 1000), content_unit: 'ml' };
}

/** "Half barrel (15.5 gal)" / "750 ml" / "1 liter" / "12 oz" for showing a saved size. */
export function contentLabel(ml) {
  if (!(ml > 0)) return '';
  const preset = presetForMl(ml);
  if (preset) return preset.label;
  const f = contentForm(ml);
  if (f.content_unit === 'l') return `${f.content_size} ${f.content_size === '1' ? 'liter' : 'liters'}`;
  if (f.content_unit === 'fl_oz') return `${f.content_size} oz`;
  if (f.content_unit === 'gal') return `${f.content_size} gal`;
  return `${f.content_size} ml`;
}
