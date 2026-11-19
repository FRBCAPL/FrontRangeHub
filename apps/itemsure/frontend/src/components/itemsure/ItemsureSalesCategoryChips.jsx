import React, { useEffect, useMemo } from 'react';
import {
  ALL_ITEMS, NO_CATEGORY, categoryTree, inCategory, labelWithIcon, rootOf,
} from '../../utils/itemsureCategories.js';
import useScrollArrows from '../../hooks/useScrollArrows.js';
import ItemsureScrollArrow from './ItemsureScrollArrow.jsx';

function Chip({ value, label, count, selected, onSelect, closeTo = ALL_ITEMS }) {
  const on = selected === value;
  return (
    <button
      type="button"
      className={`isu-chip isu-chip--choice${on ? ' is-selected' : ''}`}
      aria-pressed={on}
      onClick={() => onSelect(on ? closeTo : value)}
    >
      {label} <span className="isu-chip-count">{count}</span>
    </button>
  );
}

/**
 * Scrollable category filter for sales lists (same swipe pattern as Inventory).
 * "All categories" stays pinned. `rows` need `categoryId`. `selected` uses ALL_ITEMS when
 * showing every row.
 */
export default function ItemsureSalesCategoryChips({ categories, rows, selected, onSelect }) {
  const tree = useMemo(() => categoryTree(categories || []), [categories]);
  const pick = selected || ALL_ITEMS;
  const count = (key) => rows.filter((row) => inCategory(tree, { category_id: row.categoryId }, key)).length;
  const uncategorized = count(NO_CATEGORY);
  const openRoot = rootOf(tree, pick === ALL_ITEMS ? '' : pick);
  const subs = openRoot ? tree.childrenOf(openRoot) : [];
  const rootName = openRoot ? tree.byId.get(openRoot)?.name : '';
  const mainArrows = useScrollArrows(`${categories?.length || 0}|${rows.length}|${pick}`);
  const subArrows = useScrollArrows(`${openRoot}|${subs.length}`);
  const scroller = mainArrows.ref;
  const subScroller = subArrows.ref;

  useEffect(() => {
    if (pick === ALL_ITEMS) return;
    scroller.current?.querySelector('.is-selected')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    if (pick !== openRoot) {
      subScroller.current?.querySelector('.is-selected')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [pick, scroller, subScroller, openRoot]);

  if (!tree.roots.length && !uncategorized) return null;

  return (
    <div className="isu-chip-rows isu-sales-cat-chips">
      <div className="isu-chipbar">
        <ItemsureScrollArrow direction={-1} label="Categories" arrows={mainArrows} />
        <div className="isu-chip-pinned">
          <Chip value={ALL_ITEMS} label="All categories" count={rows.length} selected={pick} onSelect={onSelect} />
        </div>
        <div className="isu-chips isu-chips--scroll" role="group" aria-label="Filter by category" ref={scroller} onScroll={mainArrows.onScroll}>
          {tree.roots.map((c) => (
            <Chip key={c.id} value={c.id} label={labelWithIcon(c)} count={count(c.id)} selected={openRoot || pick} onSelect={onSelect} />
          ))}
          {uncategorized ? (
            <Chip value={NO_CATEGORY} label="No category" count={uncategorized} selected={pick} onSelect={onSelect} />
          ) : null}
        </div>
        <ItemsureScrollArrow direction={1} label="Categories" arrows={mainArrows} />
      </div>
      {openRoot && subs.length ? (
        <div className="isu-chipbar isu-subbar">
          <ItemsureScrollArrow direction={-1} label="Subcategories" arrows={subArrows} />
          <div className="isu-chip-pinned">
            <Chip value={openRoot} label={`All ${rootName}`} count={count(openRoot)} selected={pick} onSelect={onSelect} />
          </div>
          <div className="isu-chips isu-chips--scroll isu-chips--subs" role="group" aria-label={`Subcategories in ${rootName}`} ref={subScroller} onScroll={subArrows.onScroll}>
            {subs.map((c) => (
              <Chip key={c.id} value={c.id} label={labelWithIcon(c)} count={count(c.id)} selected={pick} onSelect={onSelect} closeTo={openRoot} />
            ))}
          </div>
          <ItemsureScrollArrow direction={1} label="Subcategories" arrows={subArrows} />
        </div>
      ) : null}
    </div>
  );
}
