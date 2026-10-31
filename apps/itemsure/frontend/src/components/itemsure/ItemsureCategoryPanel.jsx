import React, { useEffect, useState } from 'react';
import { ALL_ITEMS, labelWithIcon, NO_CATEGORY, rootOf, searchCategories } from '../../utils/itemsureCategories.js';
import { Modal } from './ItemsureUi.jsx';
import ItemsureCategoryRow from './ItemsureCategoryRow.jsx';
import ItemsureSubcategoryPanel from './ItemsureSubcategoryPanel.jsx';

const TWO_COLUMNS_FROM = 10;

/**
 * Every main category with counts and a search box. A main category's subcategories open
 * in their own window from the Subs button; searching lists matching subcategories here.
 * Picking one closes the panel. `onEdit(category)` adds a pencil for renaming or moving it.
 * Categories without items sit at the bottom; long lists use two columns on wide screens.
 */
export default function ItemsureCategoryPanel({ open, onClose, tree, count, total, uncategorized, selected, onSelect, onAdd, onEdit }) {
  const [query, setQuery] = useState('');
  const [subsOf, setSubsOf] = useState(null);
  const searching = query.trim() !== '';
  const groups = searchCategories(tree, query);
  const editable = Boolean(onEdit);
  const openRoot = rootOf(tree, selected);

  useEffect(() => {
    if (!open) setSubsOf(null);
  }, [open]);

  const finish = (action) => {
    setQuery('');
    setSubsOf(null);
    onClose();
    action?.();
  };
  const pick = (value) => finish(() => onSelect(value));
  const editor = (category) => (onEdit ? () => finish(() => onEdit(category)) : null);

  const subsButton = (root) => {
    const n = tree.childrenOf(root.id).length;
    if (!n) return null;
    return (
      <button
        type="button"
        className="isu-catpanel-toggle"
        aria-label={`Show ${n} subcategor${n === 1 ? 'y' : 'ies'} in ${root.name}`}
        onClick={() => setSubsOf(root.id)}
      >
        <span className="isu-catpanel-subs">{n}</span>
        <span aria-hidden="true">{'\u203A'}</span>
      </button>
    );
  };

  const rootRows = ({ root, children }) => (
    <React.Fragment key={root.id}>
      <ItemsureCategoryRow
        label={labelWithIcon(root)}
        count={count(root.id)}
        on={selected === root.id || (!searching && openRoot === root.id)}
        onPick={() => pick(root.id)}
        editable={editable}
        onEdit={editor(root)}
        subs={subsButton(root)}
      />
      {searching
        ? children.map((c) => (
            <ItemsureCategoryRow key={c.id} label={c.name} count={count(c.id)} sub on={selected === c.id} onPick={() => pick(c.id)} editable={editable} onEdit={editor(c)} />
          ))
        : null}
    </React.Fragment>
  );

  const filled = searching ? groups : groups.filter((g) => count(g.root.id) > 0);
  const empty = searching ? [] : groups.filter((g) => count(g.root.id) === 0);
  const twoColumns = groups.length > TWO_COLUMNS_FROM;
  const head = (
    <div className="isu-catpanel-item isu-catpanel-head">
      <span className="isu-catpanel-headrow"><span>Category</span><span>Items</span></span>
      <span>Subs</span>
      {editable ? <span>Edit</span> : null}
    </div>
  );

  return (
    <>
      <Modal open={open && !subsOf} title="All categories" onClose={() => finish()} wide={twoColumns}>
        <div className="isu-catpanel">
          <input
            type="search"
            className="isu-search"
            placeholder="Find a category"
            aria-label="Find a category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className={`isu-catpanel-scroll${twoColumns ? ' is-two' : ''}`}>
            <div className={`isu-catpanel-heads${editable ? ' is-editable' : ''}`} aria-hidden="true">
              {head}
              {twoColumns ? head : null}
            </div>
            <ul className={`isu-catpanel-list is-flow${editable ? ' is-editable' : ''}`}>
              {!searching ? (
                <ItemsureCategoryRow label="All items" count={total} on={selected === ALL_ITEMS} onPick={() => pick(ALL_ITEMS)} editable={editable} />
              ) : null}
              {filled.map(rootRows)}
              {!searching && uncategorized ? (
                <ItemsureCategoryRow label="No category" count={uncategorized} on={selected === NO_CATEGORY} onPick={() => pick(NO_CATEGORY)} editable={editable} />
              ) : null}
              {empty.length ? (
                <li className="isu-catpanel-divider">No items yet ({empty.length})</li>
              ) : null}
              {empty.map(rootRows)}
            </ul>
          </div>
          {searching && !groups.length ? <p className="isu-muted isu-center">No category matches &ldquo;{query.trim()}&rdquo;.</p> : null}
          {onAdd ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--block" onClick={() => finish(() => onAdd(''))}>
              + Add a category
            </button>
          ) : null}
        </div>
      </Modal>
      <ItemsureSubcategoryPanel
        root={open && subsOf ? tree.byId.get(subsOf) : null}
        tree={tree}
        count={count}
        selected={selected}
        onPick={pick}
        onEdit={onEdit ? (c) => finish(() => onEdit(c)) : null}
        onAdd={onAdd ? (parentId) => finish(() => onAdd(parentId)) : null}
        onBack={() => setSubsOf(null)}
        onClose={() => finish()}
      />
    </>
  );
}
