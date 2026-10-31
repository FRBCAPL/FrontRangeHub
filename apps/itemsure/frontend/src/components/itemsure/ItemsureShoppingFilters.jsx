import React, { useState } from 'react';
import { categoryOptions } from '../../utils/itemsureCategories.js';
import { sites, SITE } from '../../data/itemsureTerms.js';
import { Field, Modal } from './ItemsureUi.jsx';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'low', label: 'Running low' },
  { value: 'below_par', label: 'Needs topping up' },
];

/** Status chips plus a Filters button that opens Place, Category and Group by. */
export default function ItemsureShoppingFilters({ filters, onChange, groups, locations, tree, counts }) {
  const [open, setOpen] = useState(false);
  const active = (filters.locationId ? 1 : 0) + (filters.categoryId ? 1 : 0);

  return (
    <div className="isu-shop-filters">
      <div className="isu-chips" role="group" aria-label="Show">
        {STATUSES.map((s) => (
          <button
            key={s.value || 'all'}
            type="button"
            className={`isu-chip isu-chip--choice${filters.status === s.value ? ' is-selected' : ''}`}
            aria-pressed={filters.status === s.value}
            onClick={() => onChange({ status: s.value })}
          >
            {s.label}
            <span className="isu-chip-count">{counts[s.value || 'all']}</span>
          </button>
        ))}
        <button type="button" className="isu-chip isu-chip--choice isu-shop-filter-btn" onClick={() => setOpen(true)}>
          Filters{active ? ` (${active})` : ''} · {groups[filters.group]?.label}
        </button>
      </div>

      <Modal open={open} title="Filter the list" onClose={() => setOpen(false)}>
        <div className="isu-stack">
          <Field label={SITE}>
            <select value={filters.locationId} onChange={(e) => onChange({ locationId: e.target.value })}>
              <option value="">All {sites}</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={filters.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}>
              <option value="">All categories</option>
              {categoryOptions(tree).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Group the list by">
            <select value={filters.group} onChange={(e) => onChange({ group: e.target.value })}>
              {Object.entries(groups).map(([key, g]) => <option key={key} value={key}>{g.label}</option>)}
            </select>
          </Field>
          <div className="isu-shop-filter-actions">
            {active ? (
              <button type="button" className="isu-btn isu-btn--ghost" onClick={() => onChange({ locationId: '', categoryId: '' })}>Clear filters</button>
            ) : null}
            <button type="button" className="isu-btn isu-btn--primary" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
