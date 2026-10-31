import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';

/** A heading's words and count; with `show`, a link to the Shopping list on that status. */
function Title({ text, count, show }) {
  const body = <>{text} <span className="isu-item-group-count">{count}</span></>;
  if (!show) return body;
  return (
    <Link to={`${ITEMSURE_PATH}/restock?show=${show}`} className="isu-item-group-link" title="Open the shopping list">
      {body}
      <span className="isu-item-group-go">Shopping list {'\u203A'}</span>
    </Link>
  );
}

function Lists({ group, renderItem }) {
  const compact = group?.key === 'good';
  const parts = group?.parts || [{ items: group?.items || [] }];
  return parts.map((part, n) => (
    <React.Fragment key={n}>
      {part.label ? (
        <h3 className={`isu-item-part-title${n ? ' is-later' : ''}`}>
          <Title text={part.label} count={part.items.length} show={part.show} />
        </h3>
      ) : null}
      <ul className={`isu-item-list isu-item-grid${compact ? ' is-compact' : ''}`}>
        {part.items.map((item) => renderItem(item, compact))}
      </ul>
    </React.Fragment>
  ));
}

/**
 * The Inventory list in sections: "Running Low" first, then "Top Offs" (needing
 * topping up), then "All good" as compact one-line rows, then the rest. With only one
 * section there is no heading, unless `titled`. Running Low and Top Offs headings open
 * the Shopping list on that status.
 * `groups` comes from groupByStatus; `renderItem(item, compact)` draws one row.
 */
export default function ItemsureItemGroups({ groups, renderItem, titled = false }) {
  if (groups.length <= 1 && !titled) {
    return <Lists group={groups[0]} renderItem={renderItem} />;
  }
  return (
    <div className="isu-item-groups">
      {groups.map((g) => (
        <section key={g.key} className={`isu-item-group isu-item-group--${g.key}${g.low ? ' is-low' : ''}`} aria-label={g.title}>
          <h2 className="isu-item-group-title">
            <Title text={g.title} count={g.count ?? g.items.length} show={g.show} />
          </h2>
          <Lists group={g} renderItem={renderItem} />
        </section>
      ))}
    </div>
  );
}
