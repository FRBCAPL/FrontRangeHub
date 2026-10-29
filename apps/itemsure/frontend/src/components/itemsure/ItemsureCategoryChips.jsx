import React from 'react';
import { ALL_ITEMS, categoryTree, inCategory, NO_CATEGORY, rootOf } from '../../utils/itemsureCategories.js';

export { ALL_ITEMS, NO_CATEGORY };

function Chip({ value, label, count, selected, onSelect, closeTo = '' }) {
  const on = selected === value;
  return (
    <button type="button" className={`isu-chip isu-chip--choice${on ? ' is-selected' : ''}`} aria-pressed={on} onClick={() => onSelect(on ? closeTo : value)}>
      {label} <span className="isu-chip-count">{count}</span>
    </button>
  );
}

/**
 * Main category buttons with item counts (a main category counts its subcategories too).
 * Choosing a main category opens a second row with its subcategories. Choosing again closes it.
 * `onAdd(parentId)` adds a category; with a parent it adds a subcategory.
 */
export default function ItemsureCategoryChips({ categories, items, selected, onSelect, onAdd }) {
  const tree = categoryTree(categories);
  const count = (key) => items.filter((item) => inCategory(tree, item, key)).length;
  const uncategorized = count(NO_CATEGORY);
  const openRoot = rootOf(tree, selected);
  const subs = openRoot ? tree.childrenOf(openRoot) : [];
  const rootName = openRoot ? tree.byId.get(openRoot).name : '';

  return (
    <div className="isu-chip-rows">
      <div className="isu-chips" role="group" aria-label="Categories">
        {tree.roots.map((c) => (
          <Chip key={c.id} value={c.id} label={c.name} count={count(c.id)} selected={openRoot} onSelect={onSelect} />
        ))}
        {uncategorized ? <Chip value={NO_CATEGORY} label="No category" count={uncategorized} selected={selected} onSelect={onSelect} /> : null}
        <Chip value={ALL_ITEMS} label="All items" count={items.length} selected={selected} onSelect={onSelect} />
        {onAdd ? <button type="button" className="isu-chip isu-chip--add" onClick={() => onAdd('')}>+ Category</button> : null}
      </div>
      {openRoot && (subs.length || onAdd) ? (
        <div className="isu-chips isu-chips--sub" role="group" aria-label={`Inside ${rootName}`}>
          {subs.map((c) => (
            <Chip key={c.id} value={c.id} label={c.name} count={count(c.id)} selected={selected} onSelect={onSelect} closeTo={openRoot} />
          ))}
          {onAdd ? (
            <button type="button" className="isu-chip isu-chip--add" onClick={() => onAdd(openRoot)}>+ Sub in {rootName}</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
