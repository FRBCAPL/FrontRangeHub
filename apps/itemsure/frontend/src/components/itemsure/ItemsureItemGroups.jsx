import React from 'react';

/**
 * The Inventory list in sections: "Needs attention" first, then "All good" as compact
 * one-line rows, then the rest. With only one section there is no heading, unless `titled`.
 * `groups` comes from groupByStatus; `renderItem(item, compact)` draws one row.
 */
export default function ItemsureItemGroups({ groups, renderItem, titled = false }) {
  if (groups.length <= 1 && !titled) {
    const only = groups[0];
    return (
      <ul className={`isu-item-list isu-item-grid${only?.key === 'good' ? ' is-compact' : ''}`}>
        {(only?.items || []).map((item) => renderItem(item, only.key === 'good'))}
      </ul>
    );
  }
  return (
    <div className="isu-item-groups">
      {groups.map((g) => (
        <section key={g.key} className={`isu-item-group isu-item-group--${g.key}`} aria-label={g.title}>
          <h2 className="isu-item-group-title">
            {g.title} <span className="isu-item-group-count">{g.items.length}</span>
          </h2>
          <ul className={`isu-item-list isu-item-grid${g.key === 'good' ? ' is-compact' : ''}`}>
            {g.items.map((item) => renderItem(item, g.key === 'good'))}
          </ul>
        </section>
      ))}
    </div>
  );
}
