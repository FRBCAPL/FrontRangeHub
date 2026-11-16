import React from 'react';

/** A row of tabs. `tabs` is [{ id, label, badge? }]; the page shows the matching panel itself. */
export default function ItemsureTabs({ tabs, selected, onSelect, label }) {
  return (
    <div className="isu-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === selected}
          className={`isu-tab${t.id === selected ? ' is-active' : ''}${t.badge ? ' has-badge' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
          {t.badge ? <span className="isu-tab-badge" aria-label={t.badge}>{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
