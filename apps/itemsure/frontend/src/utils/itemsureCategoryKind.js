// What kind of thing a category (or item) is, from its names, so ItemSure can start with the
// likely answer: liquor is poured 1.5 oz from 750 ml bottles, bottled beer counted in cases is
// sold one bottle at a time, and so on. People always check and can change it.

const DRAFT = /\b(draft|draught|kegs?|on tap|taps?)\b/i;
const WINE = /\b(wines?|champagne|prosecco|cava|sangria|merlot|cabernet|chardonnay|pinot|ros[eé]|moscato|riesling)\b/i;
const LIQUOR = /\b(liquors?|spirits?|wells?|rum|vodka|whiske?y|bourbon|tequila|gin|scotch|schnapps|liqueu?rs?|cordials?|mezcal|brandy|cognac|moonshine)\b/i;
const PACKAGED = /\b(beers?|bottles?|btl|cans?|canned|ciders?|seltzers?|lagers?|ipas?|ales?|tall ?boys?|sodas?|pop|energy|mixers?)\b/i;
const GROUP_UNIT = /^(case|cases|cs|pack|packs|pk|box|boxes|bx|carton|cartons|ctn|tray|trays|crate|crates|sleeve|sleeves|flat|flats|bundle|bundles)\b/i;

/** 'draft' | 'wine' | 'liquor' | 'packaged' | 'other', from names (and a keg unit). */
export function kindOf(text, unit) {
  const words = String(text || '');
  if (DRAFT.test(words) || /keg|barrel/i.test(`${unit?.code || ''} ${unit?.name || ''}`)) return 'draft';
  if (WINE.test(words)) return 'wine';
  if (LIQUOR.test(words)) return 'liquor';
  if (PACKAGED.test(words)) return 'packaged';
  return 'other';
}

/**
 * Kind of an item from its name, its own category, then parents if still unclear.
 * A keg stays draft even when it sits under Liquor. categoryNames is nearest-first.
 */
export function kindForNames(itemName, categoryNames, unit) {
  const names = categoryNames || [];
  const first = kindOf(`${itemName || ''} ${names[0] || ''}`, unit);
  if (first !== 'other') return first;
  return kindOf(`${itemName || ''} ${names.join(' ')}`, unit);
}

/** True for units that hold several singles: case, pack, box, sleeve… */
export const isGroupUnit = (unit) => GROUP_UNIT.test((unit?.code || '').trim()) || GROUP_UNIT.test((unit?.name || '').trim());

const HALF_BARREL_ML = 15.5 * 3785.41;
export const DEFAULT_PIECES = 24;

/**
 * The likely starting answer for a category: { amount, unit, contentMl, pieces, reason }
 * (any may be null), or null when there's no good guess. unit is what its items are counted in.
 */
export function starterFor(text, unit) {
  const kind = kindOf(text, unit);
  const group = isGroupUnit(unit);
  if (kind === 'liquor') return { amount: 1.5, unit: 'fl_oz', contentMl: 750, pieces: null, reason: 'Looks like liquor: a 1.5 oz pour from 750 ml bottles' };
  if (kind === 'wine') return { amount: 6, unit: 'fl_oz', contentMl: 750, pieces: null, reason: 'Looks like wine: a 6 oz glass from 750 ml bottles' };
  if (kind === 'draft') return { amount: 16, unit: 'fl_oz', contentMl: HALF_BARREL_ML, pieces: null, reason: 'Looks like draft: a 16 oz pour from a half barrel' };
  if (group) {
    return kind === 'packaged'
      ? { amount: 1, unit: 'piece', contentMl: null, pieces: DEFAULT_PIECES, reason: 'Counted in cases, sold one at a time' }
      : null;
  }
  if (kind === 'packaged' || kind === 'other') return { amount: 1, unit: 'base', contentMl: null, pieces: null, reason: 'Sold whole, one at a time' };
  return null;
}
