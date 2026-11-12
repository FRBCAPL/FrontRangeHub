import React from 'react';
import { MY_ITEM_FILTERS } from '../../utils/consignmentMyItemsFilter.js';

/** Search box plus filter buttons for the seller's My items list. Buttons with nothing in them are hidden. */
export default function ConsignmentMyItemsFilters({ filter, onFilter, query, onQuery, counts }) {
  return (
    <div className="cs-mine-filters">
      <input
        type="search"
        className="cs-mine-search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search your items: name, brand or item #"
        aria-label="Search your items"
      />
      <div className="cs-mine-chips" role="group" aria-label="Show">
        {MY_ITEM_FILTERS.filter((f) => f.id === 'all' || f.id === filter || counts[f.id]).map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? 'active' : ''}
            aria-pressed={filter === f.id}
            onClick={() => onFilter(f.id)}
          >
            {f.label} <span className="cs-mine-chip-count">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
