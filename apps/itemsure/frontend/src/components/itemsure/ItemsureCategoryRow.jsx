import React from 'react';

const gap = <span className="isu-catpanel-gap" aria-hidden="true" />;

/**
 * One row of a category list. Every row has the same columns (name and count,
 * subcategories, edit) so they line up; a row without a button keeps an empty space.
 */
export default function ItemsureCategoryRow({ label, count, on, sub = false, onPick, editable, onEdit = null, subs = null, subsColumn = true }) {
  return (
    <li className={`isu-catpanel-item${count ? '' : ' is-empty'}`}>
      <button type="button" className={`isu-catpanel-row${sub ? ' is-sub' : ''}${on ? ' is-selected' : ''}`} aria-pressed={on} onClick={onPick}>
        <span>{label}</span>
        <span className="isu-chip-count">{count}</span>
      </button>
      {subsColumn ? subs || gap : null}
      {editable ? (
        onEdit ? (
          <button type="button" className="isu-catpanel-edit" aria-label={`Edit ${label}`} title={`Edit ${label}`} onClick={onEdit}>
            <span aria-hidden="true">{'\u270E'}</span>
          </button>
        ) : gap
      ) : null}
    </li>
  );
}
