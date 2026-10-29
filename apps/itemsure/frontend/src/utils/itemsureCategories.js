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

/** The main category a chosen chip sits in (itself for a main one), or null. */
export function rootOf(tree, selected) {
  if (!tree.byId.has(selected)) return null;
  return tree.parentOf(selected) || selected;
}
