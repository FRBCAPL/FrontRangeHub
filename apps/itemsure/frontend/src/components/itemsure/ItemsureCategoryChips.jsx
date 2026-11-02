import React, { useEffect, useState } from 'react';
import { ALL_ITEMS, categoryTree, foundIn, labelWithIcon, NO_CATEGORY, rootOf } from '../../utils/itemsureCategories.js';
import useScrollArrows from '../../hooks/useScrollArrows.js';
import ItemsureCategoryPanel from './ItemsureCategoryPanel.jsx';
import ItemsureScrollArrow from './ItemsureScrollArrow.jsx';

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
 * A one-line swipe row of main categories with item counts (a main category counts its
 * subcategories too). Under it, "All items" and "Browse/Edit Categories ▾" (a searchable list of everything).
 * Choosing a main category opens a slim swipe row of its subcategories right under it (with
 * "+ Sub" at the end). Choosing it again closes the row.
 * `onAdd(parentId)` adds a category; with a parent it adds a subcategory.
 * `onEdit(category)` edits one, from the "All categories" panel. `onReorder(parentId)` opens the
 * order window ('' for main categories); `onShowArchived` lists the `archivedCount` archived ones.
 */
export default function ItemsureCategoryChips({ categories, items, selected, onSelect, onAdd, onEdit, onReorder = null, archivedCount = 0, onShowArchived }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const mainArrows = useScrollArrows(`${categories.length}|${items.length}`);
  const tree = categoryTree(categories);
  const count = (key) => items.filter((item) => foundIn(tree, item, key)).length;
  const uncategorized = count(NO_CATEGORY);
  const openRoot = rootOf(tree, selected);
  const subs = openRoot ? tree.childrenOf(openRoot) : [];
  const rootName = openRoot ? tree.byId.get(openRoot).name : '';
  const subArrows = useScrollArrows(`${openRoot}|${subs.length}`);
  const scroller = mainArrows.ref;
  const subScroller = subArrows.ref;

  // Keep the chosen category (and subcategory) in view in the swipe rows.
  useEffect(() => {
    scroller.current?.querySelector('.is-selected')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    subScroller.current?.querySelector('.is-selected')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selected, scroller, subScroller]);

  return (
    <div className="isu-chip-rows">
      <div className="isu-chipbar">
        <ItemsureScrollArrow direction={-1} label="Categories" arrows={mainArrows} />
        <div className="isu-chips isu-chips--scroll" role="group" aria-label="Categories" ref={scroller} onScroll={mainArrows.onScroll}>
          {tree.roots.map((c) => (
            <Chip key={c.id} value={c.id} label={labelWithIcon(c)} count={count(c.id)} selected={openRoot} onSelect={onSelect} />
          ))}
          {uncategorized ? <Chip value={NO_CATEGORY} label="No category" count={uncategorized} selected={selected} onSelect={onSelect} /> : null}
        </div>
        <ItemsureScrollArrow direction={1} label="Categories" arrows={mainArrows} />
      </div>
      {openRoot && (subs.length || onAdd) ? (
        <div className="isu-chipbar isu-subbar">
          <ItemsureScrollArrow direction={-1} label="Subcategories" arrows={subArrows} />
          <div className="isu-chips isu-chips--scroll isu-chips--subs" role="group" aria-label={`Subcategories in ${rootName}`} ref={subScroller} onScroll={subArrows.onScroll}>
            {subs.length ? (
              <Chip value={openRoot} label={`All ${rootName}`} count={count(openRoot)} selected={selected} onSelect={onSelect} closeTo={openRoot} />
            ) : null}
            {subs.map((c) => (
              <Chip key={c.id} value={c.id} label={labelWithIcon(c)} count={count(c.id)} selected={selected} onSelect={onSelect} closeTo={openRoot} />
            ))}
            {onAdd ? (
              <button type="button" className="isu-chip isu-chip--add" onClick={() => onAdd(openRoot)} title={`Add a subcategory in ${rootName}`}>
                {subs.length ? '+ Sub' : `+ Add a subcategory in ${rootName}`}
              </button>
            ) : null}
          </div>
          <ItemsureScrollArrow direction={1} label="Subcategories" arrows={subArrows} />
        </div>
      ) : null}
      <div className="isu-chips-actions">
        <Chip value={ALL_ITEMS} label="All items" count={items.length} selected={selected} onSelect={onSelect} />
        <button type="button" className="isu-chip isu-chip--more" onClick={() => setPanelOpen(true)} aria-haspopup="dialog">
          Browse/Edit Categories {'\u25BE'}
        </button>
      </div>
      <ItemsureCategoryPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        tree={tree}
        count={count}
        total={items.length}
        uncategorized={uncategorized}
        selected={selected}
        onSelect={onSelect}
        onAdd={onAdd}
        onEdit={onEdit}
        onReorder={onReorder}
        archivedCount={archivedCount}
        onShowArchived={onShowArchived}
      />
    </div>
  );
}
