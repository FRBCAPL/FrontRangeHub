// Categories with one optional level of subcategories: "Liquor › Rum".
// A subcategory whose main category is archived or missing is treated as a main category.

export const ALL_ITEMS = 'all';
export const NO_CATEGORY = 'none';
export const PATH_SEPARATOR = ' \u203a ';

/** Active categories as { roots, childrenOf(id), parentOf(id), byId }. */
export function categoryTree(categories) {
  const active = categories.filter((c) => c.is_active !== false);
  const byId = new Map(active.map((c) => [c.id, c]));
  const parentOf = (id) => {
    const parentId = byId.get(id)?.parent_category_id;
    return parentId && byId.has(parentId) ? parentId : null;
  };
  const roots = active.filter((c) => !parentOf(c.id));
  const children = new Map();
  for (const c of active) {
    const p = parentOf(c.id);
    if (p) children.set(p, [...(children.get(p) || []), c]);
  }
  return { roots, byId, parentOf, childrenOf: (id) => children.get(id) || [] };
}

/** "Liquor › Rum" for a subcategory, "Liquor" for a main one, '' when unknown. */
export function categoryPath(tree, id) {
  const c = tree.byId.get(id);
  if (!c) return '';
  const p = tree.parentOf(id);
  return p ? `${tree.byId.get(p).name}${PATH_SEPARATOR}${c.name}` : c.name;
}

/** Main categories, each followed by its subcategories: for pickers. */
export function categoryOptions(tree) {
  return tree.roots.flatMap((root) => [
    { id: root.id, label: root.name },
    ...tree.childrenOf(root.id).map((c) => ({ id: c.id, label: `${root.name}${PATH_SEPARATOR}${c.name}` })),
  ]);
}

/**
 * Does an item belong under the chosen chip? A main category includes its subcategories.
 * Items in no category, or in an archived one, go under "No category".
 */
export function inCategory(tree, item, selected) {
  if (!selected || selected === ALL_ITEMS) return true;
  const known = tree.byId.has(item.category_id);
  if (selected === NO_CATEGORY) return !known;
  if (!known) return false;
  return item.category_id === selected || tree.parentOf(item.category_id) === selected;
}

/**
 * For browsing the item list: like inCategory, but an item also shows under its extra
 * categories (`item.extraCategoryIds`). Counts, levels, and restock use inCategory only.
 */
export function foundIn(tree, item, selected) {
  if (inCategory(tree, item, selected)) return true;
  if (!tree.byId.has(selected)) return false;
  return (item.extraCategoryIds || []).some((id) => tree.byId.has(id) && (id === selected || tree.parentOf(id) === selected));
}

/** Paths like "Bar › Garnish" for an item's extra categories that are still active. */
export function extraCategoryNames(tree, item) {
  return (item.extraCategoryIds || [])
    .filter((id) => id !== item.category_id && tree.byId.has(id))
    .map((id) => categoryPath(tree, id));
}

/**
 * Main categories with their subcategories, narrowed by a typed search.
 * A main category that matches keeps all its subcategories; otherwise only matching ones show.
 * Returns [{ root, children }].
 */
export function searchCategories(tree, query) {
  const needle = String(query || '').trim().toLowerCase();
  const hit = (c) => c.name.toLowerCase().includes(needle);
  return tree.roots
    .map((root) => {
      const children = tree.childrenOf(root.id);
      if (!needle || hit(root)) return { root, children };
      return { root, children: children.filter(hit) };
    })
    .filter(({ root, children }) => !needle || hit(root) || children.length);
}

/** "🥃 Liquor" when the category has its own icon, otherwise just the name. */
export function labelWithIcon(category) {
  return category?.icon ? `${category.icon} ${category.name}` : category?.name || '';
}

/** A category's icon, or its main category's when it has none; '' when neither has one. */
export function categoryIcon(tree, id) {
  const own = tree.byId.get(id)?.icon;
  if (own) return own;
  const p = tree.parentOf(id);
  return (p && tree.byId.get(p)?.icon) || '';
}

const ORDER_STEP = 10;

/** The sort_order values to save for siblings in their new order: only the ones that change. */
export function orderChanges(ordered) {
  return ordered
    .map((c, index) => ({ id: c.id, sort_order: (index + 1) * ORDER_STEP, before: c.sort_order ?? 0 }))
    .filter((c) => c.sort_order !== c.before)
    .map(({ id, sort_order }) => ({ id, sort_order }));
}

/** Where a new category goes among its siblings: last once someone has set an order, otherwise 0 (A–Z). */
export function nextSortOrder(siblings) {
  const highest = Math.max(0, ...siblings.map((c) => c.sort_order ?? 0));
  return highest > 0 ? highest + ORDER_STEP : 0;
}

/** Moves one entry up (-1) or down (+1) in a list, returning a new list. */
export function moveInList(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * What stops a category being archived: its active subcategories and the active items
 * whose main category it is. { subs, items }; archive only when both are empty.
 */
export function archiveBlockers(tree, items, categoryId) {
  return {
    subs: tree.childrenOf(categoryId),
    items: items.filter((i) => i.is_active && i.category_id === categoryId),
  };
}

/** The main category a chosen chip sits in (itself for a main one), or null. */
export function rootOf(tree, selected) {
  if (!tree.byId.has(selected)) return null;
  return tree.parentOf(selected) || selected;
}
