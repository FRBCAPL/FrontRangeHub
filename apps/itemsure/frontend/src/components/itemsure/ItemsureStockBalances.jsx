import React, { useEffect, useMemo, useState } from 'react';
import { locationCounts, locationRows, matchesFilter, otherItemCount, spotSections } from '../../utils/itemsureLocationStock.js';
import ItemsureStockSummary from './ItemsureStockSummary.jsx';
import ItemsureStockItemCard from './ItemsureStockItemCard.jsx';
import ItemsureStockSpotView from './ItemsureStockSpotView.jsx';
import useLoosePieces from '../../hooks/useLoosePieces.js';

const VIEW_KEY = 'itemsure.stockView';

function readStockView() {
  try {
    const v = window.localStorage.getItem(VIEW_KEY);
    return v === 'items' || v === 'spots' ? v : 'spots';
  } catch {
    return 'spots';
  }
}

function saveStockView(view) {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // storage unavailable
  }
}

/**
 * Everything at one location, as item cards or spot by spot (default). Opens on Running low
 * when anything is low. "Show all items" adds catalog items not kept here. Tapping a spot
 * calls onSpot(item, slot).
 */
export default function ItemsureStockBalances({ location, data, onSpot }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('low');
  const [view, setView] = useState(readStockView);
  const [showAll, setShowAll] = useState(false);
  const piecesFor = useLoosePieces();

  const chooseView = (next) => {
    setView(next);
    saveStockView(next);
  };

  const rows = useMemo(() => locationRows(data.items, data, location, { showAll }), [data, location, showAll]);
  const counts = locationCounts(rows);

  // Open on Running low for each site; fall back to All when nothing is low there.
  useEffect(() => {
    setFilter(counts.low > 0 ? 'low' : 'all');
  }, [location.id]); // eslint-disable-line react-hooks/exhaustive-deps -- only when switching sites

  const showFilter = filter === 'low' && counts.low === 0 ? 'all' : filter;
  const others = data.places ? otherItemCount(data.items, rows) : 0;
  const term = search.trim().toLowerCase();
  const visible = rows.filter(
    (row) => matchesFilter(row, showFilter) && (!term || row.item.name.toLowerCase().includes(term) || (row.item.sku || '').toLowerCase().includes(term)),
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
      <ItemsureStockSummary counts={counts} filter={showFilter} onFilter={setFilter} />

      <div className="isu-stock-filters">
        <input type="search" placeholder="Search items" aria-label="Search items" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="isu-tabs isu-stock-view" role="tablist" aria-label="Show stock">
          {[['items', 'By item'], ['spots', 'By spot']].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} className={`isu-tab${view === id ? ' is-active' : ''}`} onClick={() => chooseView(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'items' ? (
        <ul className="isu-item-list">
          {visible.map((row) => <ItemsureStockItemCard key={row.item.id} row={row} onSpot={onSpot} pieces={piecesFor(row.item.id)} />)}
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
