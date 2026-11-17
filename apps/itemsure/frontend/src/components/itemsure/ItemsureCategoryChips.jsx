import React, { useEffect } from 'react';
import { categoryTree, foundIn, labelWithIcon, NO_CATEGORY, rootOf } from '../../utils/itemsureCategories.js';
import useScrollArrows from '../../hooks/useScrollArrows.js';
import ItemsureCategoryPanel from './ItemsureCategoryPanel.jsx';
import ItemsureScrollArrow from './ItemsureScrollArrow.jsx';
import Tip from './ItemsureTip.jsx';

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
 * subcategories too). Choosing a main category opens a slim swipe row of its subcategories
 * (with "+ Sub" at the end). Choosing it again closes the row.
 * "All items" lives under the supplier row on Inventory. Category manage UI is opened from
 * Inventory via `manageOpen` / `onManageOpenChange` (Edit → Edit categories).
 */
export default function ItemsureCategoryChips({
  categories, items, selected, onSelect, onAdd, onEdit, onReorder = null,
  archivedCount = 0, onShowArchived, manageOpen = false, onManageOpenChange = null,
}) {
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
              <Tip label={`Add a subcategory in ${rootName}`}>
                <button type="button" className="isu-chip isu-chip--add" onClick={() => onAdd(openRoot)}>
                  {subs.length ? '+ Sub' : `+ Add a subcategory in ${rootName}`}
                </button>
              </Tip>
            ) : null}
          </div>
          <ItemsureScrollArrow direction={1} label="Subcategories" arrows={subArrows} />
        </div>
      ) : null}
      <ItemsureCategoryPanel
        open={manageOpen}
        onClose={() => onManageOpenChange?.(false)}
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
