import React, { useState } from 'react';
import { CATEGORY_ICONS } from '../../data/itemsureCategoryIcons.js';
import { searchIcons, typedIcon } from '../../utils/itemsureIcons.js';

function IconButton({ icon, name, selected, onPick }) {
  return (
    <button
      type="button"
      className={`isu-iconpick-btn${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      aria-label={name}
      title={name}
      onClick={() => onPick(icon)}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

/**
 * Pick an icon: tap a starting choice, or type a word (like "pizza" or "truck") to search
 * the full library. Typed letters can also be used as the icon (like SY for Sysco).
 * `value` is the chosen icon or ''. `icons` are the starting choices (category icons by default).
 */
export default function ItemsureIconPicker({ value, onChange, label = 'Icon (optional)', icons = CATEGORY_ICONS }) {
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const results = searching ? searchIcons(query, icons) : icons;
  const current = value && !results.some((i) => i.icon === value) && !searching ? [{ icon: value, name: 'Current icon' }] : [];
  const letters = typedIcon(query);

  return (
    <fieldset className="isu-iconpick">
      <legend>{label}</legend>
      <div className="isu-iconpick-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons: type a word, like pizza or truck"
          aria-label="Search icons by word"
          autoComplete="off"
          enterKeyHint="search"
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
        />
        {searching ? (
          <button type="button" className="isu-iconpick-clear" onClick={() => setQuery('')} aria-label="Clear the search">{'\u2715'}</button>
        ) : null}
      </div>
      <div className="isu-iconpick-grid" role="group" aria-label={searching ? `Icons for ${query.trim()}` : label}>
        {searching ? null : (
          <button type="button" className={`isu-iconpick-btn is-none${value ? '' : ' is-selected'}`} aria-pressed={!value} onClick={() => onChange('')}>
            None
          </button>
        )}
        {[...current, ...results].map(({ icon, name }) => (
          <IconButton key={icon} icon={icon} name={name} selected={value === icon} onPick={onChange} />
        ))}
      </div>
      {searching && !results.length ? <p className="isu-hint">No icons for &ldquo;{query.trim()}&rdquo;. Try another word, like box, drink, or store.</p> : null}
      {searching && letters ? (
        <p className="isu-iconpick-letters">
          Or use letters:{' '}
          <button type="button" className={`isu-iconpick-btn is-letters${value === letters ? ' is-selected' : ''}`} aria-pressed={value === letters} onClick={() => onChange(letters)}>
            {letters}
          </button>
        </p>
      ) : null}
    </fieldset>
  );
}
