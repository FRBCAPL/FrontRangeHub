import React, { useMemo, useState } from 'react';
import { categoryOptions } from '../../utils/itemsureCategories.js';
import { sites, SITE } from '../../data/itemsureTerms.js';
import ItemsureChipScroller from './ItemsureChipScroller.jsx';
import ItemsureSupplierChips from './ItemsureSupplierChips.jsx';
import { Field, Modal } from './ItemsureUi.jsx';
import Tip from './ItemsureTip.jsx';

const STATUSES = [
  { value: '', label: 'All', tip: 'Everything on the shopping list' },
  { value: 'low', label: 'Running low', tip: 'At or under warn-at' },
  { value: 'below_par', label: 'Needs topping up', tip: 'At or below Top off at, still above Warn me at' },
];

/** Status chips, a swipe supplier bar (when set up), plus Filters for place / category / group-by. */
export default function ItemsureShoppingFilters({
  filters,
  onChange,
  groups,
  locations,
  tree,
  counts,
  suppliers = [],
}) {
  const [open, setOpen] = useState(false);
  const active = (filters.locationId ? 1 : 0) + (filters.categoryId ? 1 : 0);

  const locationOptions = useMemo(
    () => [
      { value: '', label: `All ${sites}` },
      ...locations.map((l) => ({ value: l.id, label: l.name })),
    ],
    [locations],
  );
  const categoryChoices = useMemo(
    () => [
      { value: '', label: 'All categories' },
      ...categoryOptions(tree).map((c) => ({ value: c.id, label: c.label })),
    ],
    [tree],
  );
  const groupOptions = useMemo(
    () => Object.entries(groups).map(([key, g]) => ({ value: key, label: g.label })),
    [groups],
  );

  return (
    <div className="isu-shop-filters">
      <div className="isu-chips" role="group" aria-label="Show">
        {STATUSES.map((s) => (
          <Tip key={s.value || 'all'} label={s.tip}>
            <button
              type="button"
              className={`isu-chip isu-chip--choice${filters.status === s.value ? ' is-selected' : ''}`}
              aria-pressed={filters.status === s.value}
              onClick={() => onChange({ status: s.value })}
            >
              {s.label}
              <span className="isu-chip-count">{counts[s.value || 'all']}</span>
            </button>
          </Tip>
        ))}
        <Tip label="Filter by place, category, or how the list is grouped">
          <button type="button" className="isu-chip isu-chip--choice isu-shop-filter-btn" onClick={() => setOpen(true)}>
            Filters{active ? ` (${active})` : ''} · {groups[filters.group]?.label}
          </button>
        </Tip>
      </div>

      {suppliers.length ? (
        <ItemsureSupplierChips
          suppliers={suppliers}
          value={filters.supplierId || ''}
          onChange={(supplierId) => onChange({ supplierId })}
        />
      ) : null}

      <Modal open={open} title="Filter the list" onClose={() => setOpen(false)}>
        <div className="isu-stack">
          {locations.length > 1 ? (
            <Field label={SITE}>
              <ItemsureChipScroller
                label={SITE}
                options={locationOptions}
                selected={filters.locationId || ''}
                onSelect={(locationId) => onChange({ locationId })}
              />
            </Field>
          ) : null}
          {categoryChoices.length > 1 ? (
            <Field label="Category">
              <ItemsureChipScroller
                label="Category"
                options={categoryChoices}
                selected={filters.categoryId || ''}
                onSelect={(categoryId) => onChange({ categoryId })}
              />
            </Field>
          ) : null}
          {groupOptions.length > 1 ? (
            <Field label="Group the list by">
              <ItemsureChipScroller
                label="Group by"
                options={groupOptions}
                selected={filters.group}
                onSelect={(group) => onChange({ group })}
              />
            </Field>
          ) : null}
          <div className="isu-shop-filter-actions">
            {active ? (
              <button type="button" className="isu-btn isu-btn--ghost" onClick={() => onChange({ locationId: '', categoryId: '' })}>
                Clear filters
              </button>
            ) : null}
            <button type="button" className="isu-btn isu-btn--primary" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
