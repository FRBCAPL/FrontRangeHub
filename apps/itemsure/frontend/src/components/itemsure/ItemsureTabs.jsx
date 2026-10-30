import React from 'react';

/** A row of tabs. `tabs` is [{ id, label }]; the page shows the matching panel itself. */
export default function ItemsureTabs({ tabs, selected, onSelect, label }) {
  return (
    <div className="isu-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === selected}
          className={`isu-tab${t.id === selected ? ' is-active' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
