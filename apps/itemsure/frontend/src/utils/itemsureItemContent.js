// "One bottle holds ..." on the item form: typed amount + unit <-> ml stored in item_contents.

import { FL_OZ_ML, VOLUME_ML } from './itemsurePosUsage.js';

export const CONTENT_UNITS = { ml: { label: 'ml', ml: 1 }, l: { label: 'liters', ml: 1000 }, fl_oz: { label: 'oz', ml: FL_OZ_ML } };
const MAX_ML = 1000000;

/** Asking makes no sense when the item is already counted in a volume (ml, liters, gallons). */
export const asksContent = (unitCode) => !VOLUME_ML[unitCode];

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

/** Starting text for the form: whole liters as liters, else ml. */
export function contentForm(ml) {
  if (!(ml > 0)) return { content_size: '', content_unit: 'ml' };
  if (ml >= 1000 && ml % 1000 === 0) return { content_size: String(ml / 1000), content_unit: 'l' };
  return { content_size: String(Math.round(ml * 1000) / 1000), content_unit: 'ml' };
}

/** "750 ml" / "1 liter" for showing a saved size. */
export function contentLabel(ml) {
  if (!(ml > 0)) return '';
  const f = contentForm(ml);
  if (f.content_unit === 'l') return `${f.content_size} ${f.content_size === '1' ? 'liter' : 'liters'}`;
  return `${f.content_size} ml`;
}
