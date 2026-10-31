import React, { useEffect, useState } from 'react';
import { categoryTree, rootOf, searchCategories } from '../../utils/itemsureCategories.js';
import { Modal } from './ItemsureUi.jsx';
import ItemsureCategoryQuickAdd from './ItemsureCategoryQuickAdd.jsx';

const NONE = '';

function Choice({ label, note = '', on, sub = false, disabled = false, onPick, ariaLabel = '' }) {
  return (
    <li className="isu-catpanel-item">
      <button
        type="button"
        className={`isu-catpanel-row${sub ? ' is-sub' : ''}${on ? ' is-selected' : ''}`}
        aria-pressed={on}
        aria-label={ariaLabel || undefined}
        disabled={disabled}
        onClick={onPick}
      >
        <span>{label}</span>
        {note ? <span className="isu-catpick-note">{note}</span> : on ? <span aria-hidden="true">{'\u2713'}</span> : null}
      </button>
    </li>
  );
}

/**
 * A window for picking one category. Tapping a main category with subcategories opens
 * them (with "Just <main>" to choose the main one); others are chosen right away.
 * Search finds subcategories directly. With `canManage`, a new category
 * can be added and chosen from here. `exclude` ids show greyed out with `excludeNote`
 * (text, or a function of the id).
 */
export default function ItemsureCategoryChooser({
  open, title = 'Choose a category', organizationId, categories, value = NONE, allowNone = false,
  exclude = [], excludeNote = 'already added', canManage, onChoose, onAdded, onClose,
}) {
  const tree = categoryTree(categories);
  const [query, setQuery] = useState('');
  const [inside, setInside] = useState(null);
  const searching = query.trim() !== '';
  const groups = searchCategories(tree, query);
  const root = inside ? tree.byId.get(inside) : null;

  // Opening again starts in the chosen category's main one, if it has subcategories.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    const main = rootOf(tree, value);
    setInside(main && main !== value ? main : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (id) => {
    onChoose(id);
    onClose();
  };
  const created = (row) => {
    onAdded?.(row);
    choose(row.id);
  };
  const excluded = (id) => exclude.includes(id);
  const noteFor = (id) => (excluded(id) ? (typeof excludeNote === 'function' ? excludeNote(id) : excludeNote) : '');
  const row = (c, sub = false) => {
    const subs = !sub && !searching ? tree.childrenOf(c.id).length : 0;
    if (subs) {
      const holding = rootOf(tree, value) === c.id;
      return (
        <Choice
          key={c.id}
          label={c.name}
          on={holding}
          note={`${subs} subcategor${subs === 1 ? 'y' : 'ies'}`}
          ariaLabel={`${c.name}: choose from ${subs} subcategor${subs === 1 ? 'y' : 'ies'}`}
          onPick={() => setInside(c.id)}
        />
      );
    }
    return (
      <Choice
        key={c.id}
        label={c.name}
        sub={sub}
        on={value === c.id}
        disabled={excluded(c.id)}
        note={noteFor(c.id)}
        onPick={() => choose(c.id)}
      />
    );
  };

  return (
    <Modal open={open} title={root ? root.name : title} onClose={onClose}>
      {root ? (
        <div className="isu-catpanel">
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm isu-catpanel-back" onClick={() => setInside(null)}>
            {'\u2039'} All categories
          </button>
          <ul className="isu-catpanel-list is-single">
            <Choice
              label={`Just ${root.name}`}
              on={value === root.id}
              disabled={excluded(root.id)}
              note={noteFor(root.id)}
              onPick={() => choose(root.id)}
            />
            {tree.childrenOf(root.id).map((c) => row(c, true))}
          </ul>
          {canManage ? <ItemsureCategoryQuickAdd key={root.id} organizationId={organizationId} parent={root} onCreated={created} /> : null}
        </div>
      ) : (
        <div className="isu-catpanel">
          <input
            type="search"
            className="isu-search"
            placeholder="Find a category"
            aria-label="Find a category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="isu-catpanel-list is-single">
            {allowNone && !searching ? <Choice label="No category" on={!value} onPick={() => choose(NONE)} /> : null}
            {groups.map(({ root: r, children }) => (
              <React.Fragment key={r.id}>
                {row(r)}
                {searching ? children.map((c) => row(c, true)) : null}
              </React.Fragment>
            ))}
          </ul>
          {searching && !groups.length ? <p className="isu-muted isu-center">No category matches &ldquo;{query.trim()}&rdquo;.</p> : null}
          {!tree.roots.length ? <p className="isu-muted isu-center">No categories yet.</p> : null}
          {canManage ? <ItemsureCategoryQuickAdd organizationId={organizationId} onCreated={created} /> : null}
        </div>
      )}
    </Modal>
  );
}
