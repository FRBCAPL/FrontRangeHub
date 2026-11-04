// Suggests how much of an item one point-of-sale item uses, so people confirm instead of type.
// Order: a size in the name ("16oz") > a house standard word ("pitcher") > draft/wine/liquor
// from the Clover name and category > sold whole (only when counted one at a time) >
// a house word in the category. Otherwise no guess.
// A drink that uses several items only gets a guess for its liquor; the rest need a person.

import { kindOf } from './itemsureCategoryKind.js';
import { VOLUME_ML } from './itemsurePosUsage.js';

/** Starting house standards for a business that hasn't set its own. */
export const DEFAULT_STANDARDS = [
  { keyword: 'double', amount: 3, unit: 'fl_oz' },
  { keyword: 'shot', amount: 1.5, unit: 'fl_oz' },
  { keyword: 'pint', amount: 16, unit: 'fl_oz' },
  { keyword: 'pitcher', amount: 60, unit: 'fl_oz' },
  { keyword: 'wine', amount: 6, unit: 'fl_oz' },
];

const SIZE_IN_NAME = /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz|oz|ounces?|ml)\b/i;
const CONTAINER = /\b(bottles?|btl|cans?|tallboys?)\b/i;
const WHOLE = /\b(bottles?|btl|cans?|food|beverages?|soda|water|snacks?|merch\w*|retail|candy|chips)\b/i;
const POURED = /\b(draft|draught|shots?|cocktails?|pints?|pitchers?|mugs?|glass|wells?)\b/i;
const LIQUOR = /\b(rum|vodka|whiske?y|bourbon|tequila|gin|scotch|schnapps|liqu\w+|mezcal|brandy|cognac|moonshine)\b/i;
const SINGLE_UNIT = /^(each|ea|unit|units|piece|pieces|pc|pcs|item|items|bottles?|btl|cans?)$/i;

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, word) => new RegExp(`\\b${escape(word)}(s|es)?\\b`, 'i').test(text);
const byLength = (standards) => [...standards].sort((a, b) => b.keyword.length - a.keyword.length);
const countedOneAtATime = (unit) => SINGLE_UNIT.test(unit?.code || '') || SINGLE_UNIT.test(unit?.name || '');

/**
 * { amount, unit: 'fl_oz'|'ml'|'base', reason } or null.
 * pos: { name, category_name }; unit: the item's counted unit { code, name }.
 * options.shared: the sale uses more than one item; options.itemName: this item's name.
 */
export function suggestAmount(pos, unit, standards = DEFAULT_STANDARDS, options = {}) {
  const name = pos?.name || '';
  const category = pos?.category_name || '';
  const sorted = byLength(standards);
  const shot = sorted.find((s) => s.keyword === 'shot');
  const asShot = shot ? { amount: shot.amount, unit: shot.unit, reason: 'Liquor: a shot' } : null;

  if (options.shared) return LIQUOR.test(options.itemName || '') ? asShot : null;

  const container = CONTAINER.test(name);
  const size = container ? null : name.match(SIZE_IN_NAME);
  if (size) return { amount: Number(size[1]), unit: /ml/i.test(size[2]) ? 'ml' : 'fl_oz', reason: 'From the name' };

  const inName = sorted.find((s) => hasWord(name, s.keyword));
  if (inName) return { amount: inName.amount, unit: inName.unit, reason: `House amount: ${inName.keyword}` };

  const text = `${name} ${category}`;
  // Names and Clover category only: a keg unit must not turn bottled beer into a pint.
  const kind = kindOf(text);
  if (kind === 'draft') {
    const pint = sorted.find((s) => s.keyword === 'pint');
    return pint ? { amount: pint.amount, unit: pint.unit, reason: 'Draft: a pint' } : null;
  }
  if (kind === 'wine') {
    const wine = sorted.find((s) => s.keyword === 'wine');
    return wine ? { amount: wine.amount, unit: wine.unit, reason: 'Wine: a glass' } : null;
  }
  if (!container && kind === 'liquor') return asShot;

  const bulk = Boolean(VOLUME_ML[unit?.code]) || /keg|barrel/i.test(`${unit?.code || ''} ${unit?.name || ''}`);
  if (!bulk && !POURED.test(name) && countedOneAtATime(unit) && WHOLE.test(text)) {
    return { amount: 1, unit: 'base', reason: 'Sold whole' };
  }
  if (!bulk && countedOneAtATime(unit) && unit?.code === 'each') return { amount: 1, unit: 'base', reason: 'Sold whole' };

  const inCategory = sorted.find((s) => hasWord(category, s.keyword));
  if (inCategory) return { amount: inCategory.amount, unit: inCategory.unit, reason: `House amount: ${inCategory.keyword}` };
  return null;
}
