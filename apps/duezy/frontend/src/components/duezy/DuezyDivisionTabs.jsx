import React from 'react';

export const ALL_DIVISIONS = 'all';

/** "All · Tue 8-Ball · Thu 9-Ball" pills. Counts show teams that still owe. */
export default function DuezyDivisionTabs({ divisions, active, onChange, behindCounts = {} }) {
  const tabs = [{ id: ALL_DIVISIONS, name: 'All divisions' }, ...divisions];
  return (
    <nav className="dz-div-tabs" aria-label="Divisions">
      {tabs.map((d) => {
        const count = d.id === ALL_DIVISIONS ? 0 : behindCounts[d.id] || 0;
        return (
          <button
            key={d.id}
            type="button"
            className={`dz-div-tab${active === d.id ? ' is-active' : ''}`}
            aria-pressed={active === d.id}
            onClick={() => onChange(d.id)}
          >
            {d.name}
            {count ? <span className="dz-div-tab-count" title={`${count} behind`}>{count}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
