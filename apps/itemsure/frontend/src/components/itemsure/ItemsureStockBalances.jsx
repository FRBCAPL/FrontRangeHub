import React, { useMemo, useState } from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';

function areaOrder(location) {
  return new Map(location.storageAreas.map((area, index) => [area.id, index]));
}

/** One row per item. "Not set up" means no approved count has established stock here yet. */
export default function ItemsureStockBalances({ location, items, balances }) {
  const [search, setSearch] = useState('');
  const [onlySetUp, setOnlySetUp] = useState(false);

  const rows = useMemo(() => {
    const order = areaOrder(location);
    const here = balances.filter((b) => b.location_id === location.id);
    return items
      .map((item) => {
        const slots = here
          .filter((b) => b.item_id === item.id)
          .sort((a, b) => (order.get(a.storage_area_id) ?? -1) - (order.get(b.storage_area_id) ?? -1));
        return { item, slots };
      })
      .filter((row) => row.item.isActive || row.slots.length);
  }, [location, items, balances]);

  const setUpCount = rows.filter((row) => row.slots.length).length;
  const term = search.trim().toLowerCase();
  const visible = rows.filter(
    (row) =>
      (!onlySetUp || row.slots.length) &&
      (!term || row.item.name.toLowerCase().includes(term) || (row.item.sku || '').toLowerCase().includes(term)),
  );
  const areaName = (id) => (id ? location.storageAreas.find((a) => a.id === id)?.name || 'Spot' : NO_AREA_LABEL);

  if (!rows.length) {
    return (
      <div className="isu-card isu-empty">
        <h2>No items yet</h2>
        <p className="isu-muted">Add items to your catalog, then count them here.</p>
      </div>
    );
  }

  return (
    <section className="isu-stack">
      <p className="isu-muted isu-small isu-stock-summary">
        {setUpCount} of {rows.length} item{rows.length === 1 ? '' : 's'} set up at {location.name}.
        {setUpCount < rows.length ? ' Count and approve the rest to set them up.' : ''}
      </p>
      <div className="isu-stock-filters">
        <input type="search" placeholder="Search items" aria-label="Search items" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="isu-check">
          <input type="checkbox" checked={onlySetUp} onChange={(e) => setOnlySetUp(e.target.checked)} />
          <span>Set up only</span>
        </label>
      </div>

      <ul className="isu-count-report">
        {visible.map(({ item, slots }) => (
          <li key={item.id} className="isu-card isu-stock-row">
            <div className="isu-count-report-head">
              <div>
                <strong>{item.name}</strong>
                {item.sku ? <p className="isu-muted isu-small">{item.sku}</p> : null}
              </div>
              {slots.length ? null : <span className="isu-badge isu-stock-unset">No amount yet</span>}
            </div>
            {slots.length ? (
              <ul className="isu-count-breakdown">
                {slots.map((slot) => (
                  <li key={slot.id}>
                    <span>{areaName(slot.storage_area_id)}</span>
                    <span className={displayQuantity(slot.quantity_text) === '0' ? 'isu-stock-zero' : 'isu-count-total'}>
                      {displayQuantity(slot.quantity_text)} {item.unitSymbol}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {!visible.length ? <p className="isu-muted isu-center">No items match.</p> : null}
    </section>
  );
}
