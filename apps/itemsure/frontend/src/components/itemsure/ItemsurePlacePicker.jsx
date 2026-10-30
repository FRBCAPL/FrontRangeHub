import React, { useState } from 'react';
import { groupPlaceOptions } from '../../utils/itemsurePlaceGroups.js';

const SEARCH_FROM = 9;

/**
 * A "+ Add a place" button that opens a short list of places to tap.
 * `options` are [{ key, label, group?, short? }]: options with a `group` are listed under
 * that heading by their `short` name. With many options a search box narrows the list.
 * `onPick(key)` runs for the tapped one and the list closes.
 */
export default function ItemsurePlacePicker({ label, options, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  if (!options.length) return null;
  if (!open) {
    return (
      <button type="button" className="isu-btn isu-btn--ghost isu-place-picker-open" onClick={() => setOpen(true)} aria-expanded="false">
        + {label}
      </button>
    );
  }

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const needle = query.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  const { loose, groups } = groupPlaceOptions(shown);
  const chip = (o, text) => (
    <button
      key={o.key}
      type="button"
      className={`isu-chip isu-chip--choice${o.loose ? ' is-loose' : ''}`}
      onClick={() => {
        close();
        onPick(o.key);
      }}
    >
      {text}
    </button>
  );

  return (
    <div className="isu-place-picker" role="group" aria-label={label}>
      <p className="isu-place-picker-title">{label}: tap one</p>
      {options.length >= SEARCH_FROM ? (
        <input
          type="search"
          className="isu-place-picker-search"
          placeholder="Type to find a place"
          aria-label="Find a place"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      ) : null}
      {loose.length ? <div className="isu-place-picker-list">{loose.map((o) => chip(o, o.label))}</div> : null}
      {groups.map((g) => (
        <div key={g.name} className="isu-place-picker-group">
          <p className="isu-place-picker-group-name">{g.name}</p>
          <div className="isu-place-picker-list">{g.options.map((o) => chip(o, o.short))}</div>
        </div>
      ))}
      {!shown.length ? <p className="isu-muted isu-small">Nothing matches &quot;{query.trim()}&quot;.</p> : null}
      <button type="button" className="isu-place-picker-cancel" onClick={close}>Cancel</button>
    </div>
  );
}
