import React from 'react';
import { STOCK_FILTERS } from '../../utils/itemsureLocationStock.js';

const TONE = { low: 'danger', below_par: 'warn', unset: 'muted' };

/** "18 items · 3 running low · …" as tappable filters. Empty groups are hidden. */
export default function ItemsureStockSummary({ counts, filter, onFilter }) {
  return (
    <div className="isu-stock-strip" role="group" aria-label="Show">
      {STOCK_FILTERS.filter((f) => f.id === 'all' || counts[f.id] > 0).map((f) => (
        <button
          key={f.id}
          type="button"
          className={`isu-stock-strip-btn${TONE[f.id] ? ` is-${TONE[f.id]}` : ''}${filter === f.id ? ' is-selected' : ''}`}
          aria-pressed={filter === f.id}
          onClick={() => onFilter(filter === f.id ? 'all' : f.id)}
        >
          <strong>{counts[f.id]}</strong> {f.id === 'all' ? `item${counts.all === 1 ? '' : 's'}` : f.label.toLowerCase()}
        </button>
      ))}
    </div>
  );
}
