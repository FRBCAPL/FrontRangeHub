import React, { useMemo, useState } from 'react';
import { locationCounts, locationRows, matchesFilter, otherItemCount, spotSections } from '../../utils/itemsureLocationStock.js';
import ItemsureStockSummary from './ItemsureStockSummary.jsx';
import ItemsureStockItemCard from './ItemsureStockItemCard.jsx';
import ItemsureStockSpotView from './ItemsureStockSpotView.jsx';

/**
 * Everything at one location, as item cards or spot by spot. Items show when they are
 * kept, have levels, or have stock here; "Show all items" adds the rest. Tapping a spot calls onSpot(item, slot).
 */
export default function ItemsureStockBalances({ location, data, onSpot }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('items');
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => locationRows(data.items, data, location, { showAll }), [data, location, showAll]);
  const counts = locationCounts(rows);
  const others = data.places ? otherItemCount(data.items, rows) : 0;
  const term = search.trim().toLowerCase();
  const visible = rows.filter(
    (row) => matchesFilter(row, filter) && (!term || row.item.name.toLowerCase().includes(term) || (row.item.sku || '').toLowerCase().includes(term)),
  );
  const sections = useMemo(() => spotSections(visible, location), [visible, location]);

  if (!rows.length && !others) {
    return (
      <div className="isu-card isu-empty">
        <h2>No items yet</h2>
        <p className="isu-muted">Add items to your catalog, then count them here.</p>
      </div>
    );
  }

  return (
    <section className="isu-stack">
      <ItemsureStockSummary counts={counts} filter={filter} onFilter={setFilter} />

      <div className="isu-stock-filters">
        <input type="search" placeholder="Search items" aria-label="Search items" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="isu-tabs isu-stock-view" role="tablist" aria-label="Show stock">
          {[['items', 'By item'], ['spots', 'By spot']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} className={`isu-tab${view === id ? ' is-active' : ''}`} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'items' ? (
        <ul className="isu-item-list">
          {visible.map((row) => <ItemsureStockItemCard key={row.item.id} row={row} onSpot={onSpot} />)}
        </ul>
      ) : (
        <ItemsureStockSpotView sections={sections} onSpot={onSpot} />
      )}
      {!visible.length ? <p className="isu-muted isu-center">No items match.</p> : null}

      {others || showAll ? (
        <label className="isu-check isu-center">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          <span>Show all items{others && !showAll ? ` (${others} more aren\u2019t kept here)` : ''}</span>
        </label>
      ) : null}
    </section>
  );
}
