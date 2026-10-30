import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ALL_ITEMS, categoryTree, inCategory, NO_CATEGORY, rootOf } from '../../utils/itemsureCategories.js';
import ItemsureCategoryPanel from './ItemsureCategoryPanel.jsx';

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
 * subcategories too), plus "All categories ▾" for a searchable list of everything.
 * Choosing a main category opens a second row with its subcategories. Choosing again closes it.
 * `onAdd(parentId)` adds a category; with a parent it adds a subcategory.
 */
export default function ItemsureCategoryChips({ categories, items, selected, onSelect, onAdd }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const scroller = useRef(null);
  const tree = categoryTree(categories);
  const count = (key) => items.filter((item) => inCategory(tree, item, key)).length;
  const uncategorized = count(NO_CATEGORY);
  const openRoot = rootOf(tree, selected);
  const subs = openRoot ? tree.childrenOf(openRoot) : [];
  const rootName = openRoot ? tree.byId.get(openRoot).name : '';

  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  // Keep the chosen category in view in the swipe row.
  useEffect(() => {
    scroller.current?.querySelector('.is-selected')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selected]);

  // Show each arrow only when there is more to see that way.
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setCanScroll((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, categories, items]);
  const nudge = (direction) => scroller.current?.scrollBy({ left: direction * scroller.current.clientWidth * 0.7, behavior: 'smooth' });

  return (
    <div className="isu-chip-rows">
      <div className="isu-chipbar">
        <button type="button" className="isu-chip-arrow" aria-label="Scroll categories left" disabled={!canScroll.left} onClick={() => nudge(-1)}>
          {'\u2039'}
        </button>
        <div className="isu-chips isu-chips--scroll" role="group" aria-label="Categories" ref={scroller} onScroll={measure}>
          <Chip value={ALL_ITEMS} label="All items" count={items.length} selected={selected} onSelect={onSelect} />
          {tree.roots.map((c) => (
            <Chip key={c.id} value={c.id} label={c.name} count={count(c.id)} selected={openRoot} onSelect={onSelect} />
          ))}
          {uncategorized ? <Chip value={NO_CATEGORY} label="No category" count={uncategorized} selected={selected} onSelect={onSelect} /> : null}
        </div>
        <button type="button" className="isu-chip-arrow" aria-label="Scroll categories right" disabled={!canScroll.right} onClick={() => nudge(1)}>
          {'\u203A'}
        </button>
        <button type="button" className="isu-chip isu-chip--more" onClick={() => setPanelOpen(true)} aria-haspopup="dialog">
          All categories {'\u25BE'}
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
      />
      {openRoot && (subs.length || onAdd) ? (
        <div className="isu-chips isu-chips--sub" role="group" aria-label={`Subcategories in ${rootName}`}>
          <div className="isu-chips-head">
            <p className="isu-chips-label">Subcategories in {rootName}</p>
            {onAdd ? (
              <button type="button" className="isu-chip isu-chip--add" onClick={() => onAdd(openRoot)}>+ Add a sub</button>
            ) : null}
          </div>
          {subs.length ? (
            <Chip value={openRoot} label={`All ${rootName}`} count={count(openRoot)} selected={selected} onSelect={onSelect} closeTo={openRoot} />
          ) : null}
          {subs.map((c) => (
            <Chip key={c.id} value={c.id} label={c.name} count={count(c.id)} selected={selected} onSelect={onSelect} closeTo={openRoot} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
