// Matching point-of-sale (Clover) items to ItemSure items.

const words = (text) => (text || '').toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter((w) => w.length > 1);

/**
 * The ItemSure item a Clover item most likely is, or null. Every word of the ItemSure
 * item's name (with its brand) must appear in the Clover name, and the closest fit wins
 * ("Bacardi Superior" matches "Bacardi Superior Rum Shot"). Ties are left for a person.
 */
export function suggestMatch(posName, items) {
  const have = new Set(words(posName));
  if (!have.size) return null;
  let best = null;
  let bestScore = 0;
  let tie = false;
  for (const item of items) {
    const want = [...new Set(words(`${item.brand || ''} ${item.name}`))];
    if (!want.length || !want.every((w) => have.has(w))) continue;
    const score = want.length / have.size;
    if (score > bestScore) {
      best = item;
      bestScore = score;
      tie = false;
    } else if (score === bestScore) {
      tie = true;
    }
  }
  return best && !tie ? best : null;
}

export const MATCH_FILTERS = { todo: 'Not linked', done: 'Linked', skip: 'Not tracked', all: 'All' };

export const isNotTracked = (p) => Boolean(p?.not_tracked);

/** Active ItemSure items that can be matched to Clover (not kitchen/supply skips). */
export function matchableItems(items) {
  return (items || []).filter((item) => item.is_active && !item.notSoldInPos);
}

/** Item ids any Clover button uses. `links`: Map of Clover id -> [item ids]. */
export const matchedItemIds = (links) => new Set([...(links?.values() || [])].flat());

/** Matchable items no Clover button uses yet. `matched`: Set of item ids (see matchedItemIds). */
export function itemsNotOnClover(items, matched) {
  return matchableItems(items).filter((item) => !matched?.has(item.id));
}

/**
 * Clover items to show: removed ones only while still matched; `filter` is a MATCH_FILTERS key.
 * `keep` (Clover item ids) stay under "Not matched" after their first match, until the person is done.
 * Items marked "not tracked" (generic buttons you don't stock) sit under that tab, not "Not matched".
 */
export function posRows(posItems, links, { filter = 'todo', search = '', keep = null } = {}) {
  const needle = search.trim().toLowerCase();
  return posItems.filter((p) => {
    const matched = (links.get(p.external_id) || []).length > 0;
    const skipped = isNotTracked(p) && !matched;
    if (p.is_deleted && !matched) return false;
    if (filter === 'todo' && (matched || skipped) && !keep?.has(p.external_id)) return false;
    if (filter === 'done' && !matched) return false;
    if (filter === 'skip' && !skipped) return false;
    return !needle || `${p.name} ${p.category_name} ${p.sku}`.toLowerCase().includes(needle);
  });
}

/**
 * Matched Clover items grouped by their main match (the first ItemSure item matched), A to Z:
 * [{ key, label, rows }]. Rows whose main item can't be seen go last under "Other items".
 */
export function groupByMainMatch(rows, links, itemsById) {
  const groups = new Map();
  for (const p of rows) {
    const main = itemsById.get((links.get(p.external_id) || [])[0]);
    const key = main ? main.id : '';
    if (!groups.has(key)) groups.set(key, { key, label: main ? main.name : 'Other items', rows: [] });
    groups.get(key).rows.push(p);
  }
  return [...groups.values()].sort((a, b) => (!a.key) - (!b.key) || a.label.localeCompare(b.label));
}

/** "$9.00", "$9.00 / unit", "Price varies", or "" when Clover has no price. */
export function posPrice(p) {
  if (p.price_type === 'VARIABLE') return 'Price varies';
  if (p.price_cents === null || p.price_cents === undefined) return '';
  const amount = `$${(p.price_cents / 100).toFixed(2)}`;
  return p.price_type === 'PER_UNIT' ? `${amount} / unit` : amount;
}
