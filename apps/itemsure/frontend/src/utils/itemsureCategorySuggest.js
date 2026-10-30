// Suggestions for "Also find it under", worked out from what the app has already loaded.

const LEARN_MIN = 2;

/** "Rums " -> "rum", so near-identical names match. */
export function normalName(name) {
  const text = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return text.length > 3 && text.endsWith('s') ? text.slice(0, -1) : text;
}

/**
 * Categories worth suggesting for an item whose main category is `mainId`:
 * other categories with the same name, then extras that most other items in that
 * main category share (at least two of them). Never the main category or its parent,
 * since the item already shows under those.
 */
export function suggestExtras(tree, items, mainId, itemId = null) {
  const main = tree.byId.get(mainId);
  if (!main) return [];
  const skip = new Set([mainId, tree.parentOf(mainId)]);
  const result = [];
  const add = (id) => {
    if (!skip.has(id) && tree.byId.has(id) && !result.includes(id)) result.push(id);
  };

  const wanted = normalName(main.name);
  for (const c of tree.byId.values()) {
    if (normalName(c.name) === wanted) add(c.id);
  }

  const peers = items.filter((i) => i.category_id === mainId && i.id !== itemId && i.is_active !== false);
  const counts = new Map();
  for (const peer of peers) {
    for (const id of new Set(peer.extraCategoryIds || [])) counts.set(id, (counts.get(id) || 0) + 1);
  }
  [...counts]
    .filter(([, n]) => n >= LEARN_MIN && n * 2 > peers.length)
    .sort((a, b) => b[1] - a[1])
    .forEach(([id]) => add(id));

  return result;
}

/**
 * The form's extra-category fields after the main category changes to `mainId`.
 * Suggestions from the old main category that the person didn't keep are dropped;
 * new ones are added unless they were removed before. Picked-by-hand ones stay.
 */
export function applySuggestions(form, suggestions) {
  const oldSuggested = new Set(form.suggested_extra_ids || []);
  const dismissed = new Set(form.dismissed_extra_ids || []);
  const kept = (form.extra_category_ids || []).filter((id) => !oldSuggested.has(id) || suggestions.includes(id));
  const fresh = suggestions.filter((id) => !dismissed.has(id) && !kept.includes(id));
  const stillSuggested = [...oldSuggested].filter((id) => kept.includes(id) && suggestions.includes(id));
  return {
    extra_category_ids: [...kept, ...fresh],
    suggested_extra_ids: [...stillSuggested, ...fresh],
  };
}

/** After the person edits the list by hand: removed suggestions are remembered, re-added ones forgiven. */
export function trackExtraEdits(form, nextIds) {
  const before = new Set(form.extra_category_ids || []);
  const removed = [...before].filter((id) => !nextIds.includes(id));
  const added = nextIds.filter((id) => !before.has(id));
  const suggested = (form.suggested_extra_ids || []).filter((id) => nextIds.includes(id));
  const dismissed = [
    ...(form.dismissed_extra_ids || []).filter((id) => !added.includes(id)),
    ...removed.filter((id) => (form.suggested_extra_ids || []).includes(id)),
  ];
  return { extra_category_ids: nextIds, suggested_extra_ids: suggested, dismissed_extra_ids: [...new Set(dismissed)] };
}
