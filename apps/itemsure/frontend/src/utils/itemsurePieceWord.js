// What one of the things inside a case or bag is called, guessed from the item's name and category:
// "Budweiser Bottle" / "Beer › Bottles" -> "bottles", "Napkins" -> "napkins",
// "Bone In Wings" / Food -> "wings" (or people can pick "portions"). Plain "items" otherwise.

const WORDS = [
  ['bottle', 'bottles'],
  ['can', 'cans'],
  ['napkin', 'napkins'],
  ['cup', 'cups'],
  ['lid', 'lids'],
  ['straw', 'straws'],
  ['roll', 'rolls'],
  ['wing', 'wings'],
  ['packet', 'packets'],
  ['pouch', 'pouches'],
  ['glass', 'glasses'],
  ['plate', 'plates'],
  ['fork', 'forks'],
  ['spoon', 'spoons'],
  ['knife', 'knives'],
  ['glove', 'gloves'],
  ['portion', 'portions'],
  ['bag', 'bags'],
];

const asWord = (one, many) => ({ one, many });

/** { one, many } for the pieces in a case/bag, e.g. { one: 'portion', many: 'portions' }. */
export function pieceWord(text) {
  const words = String(text || '').toLowerCase();
  for (const [one, many] of WORDS) {
    if (new RegExp(`\\b(${one}|${many}|${one}s)\\b`).test(words)) return asWord(one, many);
  }
  if (/\b(beer|seltzer|cider|soda|pop)\b/.test(words)) return asWord('bottle or can', 'bottles or cans');
  if (/\b(food|kitchen|appetizers?|entrees?|sides?)\b/.test(words)) return asWord('portion', 'portions');
  return asWord('item', 'items');
}

/** Turn a saved/picked label ("portions", "wings") into { one, many }. */
export function pieceWordFromLabel(label, about = '') {
  const raw = String(label || '').trim().toLowerCase();
  if (!raw) return pieceWord(about);
  for (const [one, many] of WORDS) {
    if (raw === one || raw === many) return asWord(one, many);
  }
  if (raw === 'bottles or cans' || raw === 'bottle or can') return asWord('bottle or can', 'bottles or cans');
  // Free text: use as both forms if singular/plural unknown.
  if (raw.endsWith('s')) return asWord(raw.replace(/s$/, '') || raw, raw);
  return asWord(raw, `${raw}s`);
}

/**
 * Labels people can pick for "One bag has ___ ___": guessed word, plus portions and items
 * when they aren't already the guess. `saved` (many-form) is included if set.
 */
export function pieceWordChoices(about, saved = '') {
  const guessed = pieceWord(about);
  const list = [guessed, asWord('portion', 'portions'), asWord('item', 'items')];
  if (saved) list.unshift(pieceWordFromLabel(saved, about));
  const seen = new Set();
  return list.filter((w) => {
    if (seen.has(w.many)) return false;
    seen.add(w.many);
    return true;
  });
}
