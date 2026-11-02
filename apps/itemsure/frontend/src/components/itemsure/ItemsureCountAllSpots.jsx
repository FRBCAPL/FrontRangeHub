import React from 'react';

/**
 * The "All spots" view of a count: the filtered items under a heading for each spot they are
 * kept in. An item kept in two spots shows twice, each box counting into its own spot.
 * `groups` from groupBySpot (null while it loads); `row(item, areaId)` draws one count row.
 */
export default function ItemsureCountAllSpots({ groups, row, needle }) {
  if (!groups) return <p className="isu-muted isu-center">Loading where items are kept…</p>;
  if (!groups.length) {
    return <p className="isu-muted">{needle ? 'No items match that search.' : 'No items match your filters.'}</p>;
  }
  return groups.map(({ area, items }) => (
    <section key={area.id || 'loose'} className="isu-count-spot-group">
      <h2 className="isu-count-others-title">
        {area.name} ({items.length})
      </h2>
      <ul className="isu-count-rows">{items.map((item) => row(item, area.id || ''))}</ul>
    </section>
  ));
}
