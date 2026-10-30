import React, { useEffect, useState } from 'react';
import { ALL_ITEMS, NO_CATEGORY, rootOf, searchCategories } from '../../utils/itemsureCategories.js';
import { Modal } from './ItemsureUi.jsx';

function Row({ label, count, on, sub = false, onPick, toggle = null }) {
  return (
    <li className="isu-catpanel-item">
      <button type="button" className={`isu-catpanel-row${sub ? ' is-sub' : ''}${on ? ' is-selected' : ''}`} aria-pressed={on} onClick={onPick}>
        <span>{label}</span>
        <span className="isu-chip-count">{count}</span>
      </button>
      {toggle}
    </li>
  );
}

/**
 * Every category with counts and a search box. Main categories with subcategories
 * open and close with the arrow; searching opens the ones that match. Picking one closes the panel.
 */
export default function ItemsureCategoryPanel({ open, onClose, tree, count, total, uncategorized, selected, onSelect, onAdd }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const searching = query.trim() !== '';
  const groups = searchCategories(tree, query);

  // Each time it opens, only the chosen category's main one starts open.
  useEffect(() => {
    if (!open) return;
    const root = rootOf(tree, selected);
    setExpanded(new Set(root ? [root] : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pick = (value) => {
    onSelect(value);
    setQuery('');
    onClose();
  };
  const flip = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal open={open} title="All categories" onClose={onClose}>
      <div className="isu-catpanel">
        <input
          type="search"
          className="isu-search"
          placeholder="Find a category"
          aria-label="Find a category"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="isu-catpanel-list">
          {!searching ? <Row label="All items" count={total} on={selected === ALL_ITEMS} onPick={() => pick(ALL_ITEMS)} /> : null}
          {groups.map(({ root, children }) => {
            const subCount = tree.childrenOf(root.id).length;
            const isOpen = searching ? children.length > 0 : expanded.has(root.id);
            return (
              <React.Fragment key={root.id}>
                <Row
                  label={root.name}
                  count={count(root.id)}
                  on={selected === root.id}
                  onPick={() => pick(root.id)}
                  toggle={subCount && !searching ? (
                    <button
                      type="button"
                      className={`isu-catpanel-toggle${isOpen ? ' is-open' : ''}`}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Hide' : 'Show'} ${subCount} subcategor${subCount === 1 ? 'y' : 'ies'} in ${root.name}`}
                      onClick={() => flip(root.id)}
                    >
                      <span className="isu-catpanel-subs">{subCount}</span>
                      <span className="isu-catpanel-arrow" aria-hidden="true">{'\u25BE'}</span>
                    </button>
                  ) : null}
                />
                {isOpen
                  ? children.map((c) => (
                      <Row key={c.id} label={c.name} count={count(c.id)} sub on={selected === c.id} onPick={() => pick(c.id)} />
                    ))
                  : null}
              </React.Fragment>
            );
          })}
          {!searching && uncategorized ? (
            <Row label="No category" count={uncategorized} on={selected === NO_CATEGORY} onPick={() => pick(NO_CATEGORY)} />
          ) : null}
        </ul>
        {searching && !groups.length ? <p className="isu-muted isu-center">No category matches &ldquo;{query.trim()}&rdquo;.</p> : null}
        {onAdd ? (
          <button
            type="button"
            className="isu-btn isu-btn--ghost isu-btn--block"
            onClick={() => {
              setQuery('');
              onClose();
              onAdd('');
            }}
          >
            + Add a category
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
