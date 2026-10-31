// Icons: search the built-in library by word, or use one or two letters (like SY for Sysco).

import { FOOD_ICONS } from '../data/itemsureIconLibraryFood.js';
import { THING_ICONS } from '../data/itemsureIconLibraryThings.js';
import { PLACE_ICONS } from '../data/itemsureIconLibraryPlaces.js';

const MAX_LENGTH = 16;
const MAX_LETTERS = 2;
const LETTER = /^[\p{L}\p{N}]/u;

const LIBRARY = [...FOOD_ICONS, ...THING_ICONS, ...PLACE_ICONS].map(([icon, name, words]) => ({ icon, name, words }));

function symbols(text) {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/** True when an icon is letters/numbers (shown smaller, like initials) rather than an emoji. */
export function isLetterIcon(icon) {
  return LETTER.test(String(icon || ''));
}

/** Up to two letters/numbers from typed text, upper-cased ('' when there are none). Spaces are ignored. */
export function typedIcon(text) {
  const letters = [];
  for (const p of symbols(String(text || '').replace(/\s+/g, ''))) {
    if (!LETTER.test(p) || letters.length === MAX_LETTERS) break;
    letters.push(p);
  }
  return letters.join('').slice(0, MAX_LENGTH).toLocaleUpperCase();
}

function wordsOf(text) {
  return String(text || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** "boxes" → ["boxes", "boxe", "box"], so plurals find the singular. */
function forms(term) {
  const out = [term];
  if (term.length > 3 && term.endsWith('es')) out.push(term.slice(0, -2));
  if (term.length > 2 && term.endsWith('s')) out.push(term.slice(0, -1));
  return out;
}

function termScore(term, nameWords, extraWords) {
  const hit = (words) => words.some((w) => forms(term).some((f) => w.startsWith(f)));
  if (hit(nameWords)) return 0;
  if (hit(extraWords)) return 1;
  return null;
}

/**
 * Icons matching a typed word or words (every word must match), best first: name matches
 * before other search words. `first` (e.g. the starting choices, as {icon, name}) is searched
 * too and wins ties. No duplicates; at most `limit` results.
 */
export function searchIcons(query, first = [], limit = 48) {
  const terms = wordsOf(query);
  if (!terms.length) return [];
  const seen = new Set();
  const found = [];
  [...first, ...LIBRARY].forEach((entry, order) => {
    if (seen.has(entry.icon)) return;
    const nameWords = wordsOf(entry.name);
    const extraWords = wordsOf(entry.words);
    let score = 0;
    for (const term of terms) {
      const s = termScore(term, nameWords, extraWords);
      if (s === null) return;
      score += s;
    }
    seen.add(entry.icon);
    found.push({ icon: entry.icon, name: entry.name, score, order });
  });
  return found
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .slice(0, limit)
    .map(({ icon, name }) => ({ icon, name }));
}
