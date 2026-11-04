import React, { useEffect, useRef, useState } from 'react';

const SHOW = 8;

/**
 * Pick an item by typing: a button (`label`) that opens a search box with up to 8 matching
 * items below it. Tapping one calls `onPick(id)` and closes. Escape or Cancel closes.
 * `items` are { id, name, brand? }.
 */
export default function ItemsureItemSearchPick({ items, label, onPick, disabled = false, placeholder = 'Type to find an item' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const input = useRef(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm isu-search-pick-open" disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = items.filter((i) => {
    const text = `${i.brand || ''} ${i.name}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="isu-search-pick">
      <div className="isu-search-pick-bar">
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
            if (e.key === 'Enter' && found.length === 1) {
              e.preventDefault();
              onPick(found[0].id);
              close();
            }
          }}
          placeholder={placeholder}
          aria-label={label}
        />
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={close}>Cancel</button>
      </div>
      <ul className="isu-search-pick-list" aria-label="Matching items">
        {found.slice(0, SHOW).map((i) => (
          <li key={i.id}>
            <button type="button" disabled={disabled} onClick={() => { onPick(i.id); close(); }}>
              {i.name}{i.brand && !i.name.toLowerCase().includes(i.brand.toLowerCase()) ? <span className="isu-muted"> · {i.brand}</span> : null}
            </button>
          </li>
        ))}
        {!found.length ? <li className="isu-muted isu-small">No items match &ldquo;{query.trim()}&rdquo;.</li> : null}
        {found.length > SHOW ? <li className="isu-muted isu-small">{found.length - SHOW} more. Keep typing to narrow it down.</li> : null}
      </ul>
    </div>
  );
}
