import React, { useState } from 'react';
import './BreakAndRunActivityTabs.css';

/** tabs: [{ id, label, count?, render: () => node }] — one panel visible at a time. */
export default function BreakAndRunActivityTabs({ tabs, initial }) {
  const [active, setActive] = useState(initial || tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) || tabs[0];

  return (
    <section className="bnr-activity">
      <div className="bnr-activity-tabs" role="tablist" aria-label="Session activity">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`bnr-tab-${tab.id}`}
            aria-selected={tab.id === current.id}
            aria-controls={`bnr-panel-${tab.id}`}
            className={tab.id === current.id ? 'is-active' : undefined}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
            {tab.count != null ? <span className="bnr-activity-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>
      <div
        className="bnr-activity-panel"
        role="tabpanel"
        id={`bnr-panel-${current.id}`}
        aria-labelledby={`bnr-tab-${current.id}`}
      >
        {current.render()}
      </div>
    </section>
  );
}

/** Newest-first list trimmed to `limit` rows with a Show all / Show fewer toggle. */
export function useShowMore(rows, limit = 15) {
  const [expanded, setExpanded] = useState(false);
  const list = rows || [];
  const visible = expanded ? list : list.slice(0, limit);
  const toggle = list.length > limit ? (
    <button type="button" className="bnr-show-more" onClick={() => setExpanded((v) => !v)}>
      {expanded ? 'Show fewer' : `Show all ${list.length}`}
    </button>
  ) : null;
  return { visible, toggle };
}
