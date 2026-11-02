import React from 'react';
import { inCategory, labelWithIcon, NO_CATEGORY, rootOf } from '../../utils/itemsureCategories.js';
import ItemsureChipScroller from './ItemsureChipScroller.jsx';

const ALL = '';

/** True when the count item is in `selected` ('' = everything; a main category includes its subcategories). */
export function countItemInCategory(categories, item, selected) {
  if (!categories || !selected) return true;
  return inCategory(categories.tree, { category_id: categories.categoryOf.get(item.item_id) || null }, selected);
}

/**
 * Category filter for a count: a swipe row of main categories (only ones with items in this
 * count), and under a chosen main category a slim row of its subcategories.
 * Chip numbers are items in this count. `selected` is a category id, NO_CATEGORY, or ''.
 * Tapping the chosen main category again goes back to everything.
 */
export default function ItemsureCountCategoryFilter({ categories, items, selected, onSelect }) {
  if (!categories) return null;
  const { tree } = categories;
  const count = (id) => items.filter((i) => countItemInCategory(categories, i, id)).length;
  const roots = tree.roots.map((c) => ({ c, n: count(c.id) })).filter((r) => r.n);
  const loose = count(NO_CATEGORY);
  if (roots.length + (loose ? 1 : 0) < 2) return null;

  const openRoot = rootOf(tree, selected);
  const subs = openRoot ? tree.childrenOf(openRoot).map((c) => ({ c, n: count(c.id) })).filter((r) => r.n) : [];
  const rootName = openRoot ? tree.byId.get(openRoot).name : '';
  const mainSelected = openRoot || (selected === NO_CATEGORY ? NO_CATEGORY : ALL);

  return (
    <div className="isu-count-categories">
      <ItemsureChipScroller
        label="Categories"
        options={[
          { value: ALL, label: 'All categories', count: items.length },
          ...roots.map(({ c, n }) => ({ value: c.id, label: labelWithIcon(c), count: n })),
          ...(loose ? [{ value: NO_CATEGORY, label: 'No category', count: loose }] : []),
        ]}
        selected={mainSelected}
        onSelect={(value) => onSelect(value === mainSelected ? ALL : value)}
      />
      {subs.length ? (
        <ItemsureChipScroller
          className="isu-chipbar--subs"
          label={`Subcategories in ${rootName}`}
          options={[
            { value: openRoot, label: `All ${rootName}`, count: count(openRoot) },
            ...subs.map(({ c, n }) => ({ value: c.id, label: labelWithIcon(c), count: n })),
          ]}
          selected={selected}
          onSelect={(value) => onSelect(value === selected ? openRoot : value)}
        />
      ) : null}
    </div>
  );
}
