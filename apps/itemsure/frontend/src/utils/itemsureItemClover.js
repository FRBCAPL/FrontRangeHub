// One ItemSure item's Clover side: which Clover items use it, which could, and which look like it.
import { suggestMatch } from './itemsurePosMatch.js';

const linkedTo = (links, externalId) => links.get(externalId) || [];

/** Clover items matched to this item (removed ones too, since they may still be matched), by name. */
export function cloverUsesFor(itemId, posItems, links) {
  return posItems
    .filter((p) => linkedTo(links, p.external_id).includes(itemId))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/** Clover items that could be matched to this item, shaped for the search picker ({ id, name }). */
export function cloverLinkable(itemId, posItems, links) {
  return posItems
    .filter((p) => !p.is_deleted && !linkedTo(links, p.external_id).includes(itemId))
    .map((p) => ({ id: p.external_id, name: p.name || 'Unnamed Clover item' }));
}

/** Unmatched Clover items whose best name match is this item (same guess as the Match list), up to `max`. */
export function cloverSuggestionsFor(itemId, posItems, links, items, max = 5) {
  const active = items.filter((i) => i.is_active);
  const found = [];
  for (const p of posItems) {
    if (found.length >= max) break;
    if (p.is_deleted || linkedTo(links, p.external_id).length) continue;
    if (suggestMatch(p.name, active)?.id === itemId) found.push(p);
  }
  return found;
}

/** Names of the other items one Clover item also uses ("Mojito" also uses mint and lime). */
export function alsoUses(externalId, itemId, links, itemsById) {
  return linkedTo(links, externalId)
    .filter((id) => id !== itemId)
    .map((id) => itemsById.get(id)?.name)
    .filter(Boolean);
}
