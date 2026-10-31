import React from 'react';

function Lists({ group, renderItem }) {
  const compact = group?.key === 'good';
  const parts = group?.parts || [group?.items || []];
  return parts.map((items, n) => (
    <ul key={n} className={`isu-item-list isu-item-grid${compact ? ' is-compact' : ''}${n ? ' isu-item-part' : ''}`}>
      {items.map((item) => renderItem(item, compact))}
    </ul>
  ));
}

/**
 * The Inventory list in sections: "Needs attention" first (running low, a gap, then needing
 * topping up), then "All good" as compact one-line rows, then the rest. With only one
 * section there is no heading, unless `titled`.
 * `groups` comes from groupByStatus; `renderItem(item, compact)` draws one row.
 */
export default function ItemsureItemGroups({ groups, renderItem, titled = false }) {
  if (groups.length <= 1 && !titled) {
    return <Lists group={groups[0]} renderItem={renderItem} />;
  }
  return (
    <div className="isu-item-groups">
      {groups.map((g) => (
        <section key={g.key} className={`isu-item-group isu-item-group--${g.key}`} aria-label={g.title}>
          <h2 className="isu-item-group-title">
            {g.title} <span className="isu-item-group-count">{g.items.length}</span>
          </h2>
          <Lists group={g} renderItem={renderItem} />
        </section>
      ))}
    </div>
  );
}
