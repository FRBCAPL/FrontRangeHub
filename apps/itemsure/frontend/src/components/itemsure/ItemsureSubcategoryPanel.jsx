import React from 'react';
import { Modal } from './ItemsureUi.jsx';
import ItemsureCategoryRow from './ItemsureCategoryRow.jsx';
import { labelWithIcon } from '../../utils/itemsureCategories.js';

/**
 * The subcategories of one main category, opened from "All categories".
 * `onBack` returns to the full list; picking, editing, or adding closes both.
 */
export default function ItemsureSubcategoryPanel({ root, tree, count, selected, onPick, onEdit, onAdd, onBack, onClose }) {
  const subs = root ? tree.childrenOf(root.id) : [];
  const editable = Boolean(onEdit);

  return (
    <Modal open={Boolean(root)} title={root ? `Subcategories in ${root.name}` : ''} onClose={onClose}>
      {root ? (
        <div className="isu-catpanel">
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm isu-catpanel-back" onClick={onBack}>
            {'\u2039'} All categories
          </button>
          <ul className={`isu-catpanel-list is-subs${editable ? ' is-editable' : ''}`}>
            <li className="isu-catpanel-item isu-catpanel-head" aria-hidden="true">
              <span className="isu-catpanel-headrow"><span>Subcategory</span><span>Items</span></span>
              {editable ? <span>Edit</span> : null}
            </li>
            <ItemsureCategoryRow
              label={`All ${root.name}`}
              count={count(root.id)}
              on={selected === root.id}
              onPick={() => onPick(root.id)}
              editable={editable}
              onEdit={onEdit ? () => onEdit(root) : null}
              subsColumn={false}
            />
            {subs.map((c) => (
              <ItemsureCategoryRow
                key={c.id}
                label={labelWithIcon(c)}
                count={count(c.id)}
                sub
                on={selected === c.id}
                onPick={() => onPick(c.id)}
                editable={editable}
                onEdit={onEdit ? () => onEdit(c) : null}
                subsColumn={false}
              />
            ))}
          </ul>
          {onAdd ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--block" onClick={() => onAdd(root.id)}>
              + Add a subcategory in {root.name}
            </button>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
