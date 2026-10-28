import React from 'react';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { Field } from './ItemsureUi.jsx';

/** Location, area, category, search, and "missing levels" filters for the levels editor. */
export default function ItemsureTargetFilters({ filters, setFilters, locations, categories }) {
  const location = locations.find((l) => l.id === filters.locationId);
  const areas = (location?.storageAreas || []).filter((a) => a.is_active);
  const set = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="isu-filters">
      <Field label="Location">
        <select value={filters.locationId} onChange={(e) => setFilters((f) => ({ ...f, locationId: e.target.value, areaId: 'all' }))}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>
      <Field label="Storage area">
        <select value={filters.areaId} onChange={set('areaId')}>
          <option value="all">All areas</option>
          <option value="">{NO_AREA_LABEL}</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select value={filters.categoryId} onChange={set('categoryId')}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Search">
        <input type="search" placeholder="Item name or SKU" value={filters.search} onChange={set('search')} />
      </Field>
      <label className="isu-check">
        <input type="checkbox" checked={filters.missingOnly} onChange={set('missingOnly')} />
        <span>Missing levels only</span>
      </label>
    </div>
  );
}
