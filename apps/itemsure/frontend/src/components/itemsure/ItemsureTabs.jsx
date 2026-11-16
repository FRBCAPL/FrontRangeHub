import React from 'react';
import Tip from './ItemsureTip.jsx';

/** A row of tabs. `tabs` is [{ id, label, tip?, badge?, badgeTip? }]; the page shows the matching panel itself. */
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
          {t.tip ? <Tip label={t.tip} side="bottom"><span>{t.label}</span></Tip> : t.label}
          {t.badge ? (
            <Tip label={t.badgeTip || t.badge} side="bottom">
              <span className="isu-tab-badge" aria-label={t.badge}>{t.badge}</span>
            </Tip>
          ) : null}
        </button>
      ))}
    </div>
  );
}
