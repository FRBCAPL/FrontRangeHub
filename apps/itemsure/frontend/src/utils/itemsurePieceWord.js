// What one of the things inside a case is called, guessed from the item's name and category:
// "Budweiser Bottle" / "Beer › Bottles" -> "bottles", "Napkins" -> "napkins". Plain "items" otherwise.

const WORDS = [
  ['bottle', 'bottles'],
  ['can', 'cans'],
  ['napkin', 'napkins'],
  ['cup', 'cups'],
  ['lid', 'lids'],
  ['straw', 'straws'],
  ['roll', 'rolls'],
  ['bag', 'bags'],
  ['packet', 'packets'],
  ['pouch', 'pouches'],
  ['glass', 'glasses'],
  ['plate', 'plates'],
  ['fork', 'forks'],
  ['spoon', 'spoons'],
  ['knife', 'knives'],
  ['glove', 'gloves'],
];

/** { one, many } for the pieces in a case, e.g. { one: 'bottle', many: 'bottles' }. */
export function pieceWord(text) {
  const words = String(text || '').toLowerCase();
  for (const [one, many] of WORDS) {
    if (new RegExp(`\\b(${one}|${many}|${one}s)\\b`).test(words)) return { one, many };
  }
  if (/\b(beer|seltzer|cider|soda|pop)\b/.test(words)) return { one: 'bottle or can', many: 'bottles or cans' };
  return { one: 'item', many: 'items' };
}
