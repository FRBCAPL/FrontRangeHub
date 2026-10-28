import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';

/** Read-only breakdown of a count: counted items with per-area entries, then items not counted. */
export default function ItemsureCountReport({ items, entries, totals, names, areaName }) {
  const byItem = {};
  entries.forEach((e) => {
    if (!byItem[e.item_id]) byItem[e.item_id] = [];
    byItem[e.item_id].push(e);
  });
  const counted = items.filter((i) => byItem[i.item_id]);
  const omitted = items.filter((i) => !byItem[i.item_id]);

  return (
    <>
      <section className="isu-stack">
        <h2 className="isu-section-title">Counted ({counted.length})</h2>
        {counted.length === 0 ? <p className="isu-muted">Nothing has been counted yet.</p> : null}
        <ul className="isu-count-report">
          {counted.map((item) => {
            const unit = item.base_unit_symbol || item.base_unit_name;
            const total = totals?.[item.item_id]?.total_base_quantity;
            return (
              <li key={item.item_id} className="isu-card">
                <div className="isu-count-report-head">
                  <strong>{item.item_name}</strong>
                  <span className="isu-count-total">{total === undefined ? '…' : `${displayQuantity(total)} ${unit}`}</span>
                </div>
                <ul className="isu-count-breakdown">
                  {byItem[item.item_id].map((e) => (
                    <li key={e.id}>
                      <span>{areaName(e.storage_area_id)}</span>
                      <span>
                        {displayQuantity(e.quantity_text)} {e.unit_symbol || e.unit_name}
                        <span className="isu-muted"> · {names[e.updated_by || e.counted_by] || 'Member'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="isu-stack">
        <h2 className="isu-section-title">Not counted ({omitted.length})</h2>
        {omitted.length === 0 ? (
          <p className="isu-muted">Every item in this count has a quantity.</p>
        ) : (
          <ul className="isu-card isu-count-omitted">
            {omitted.map((item) => (
              <li key={item.item_id}>
                {item.item_name}
                {item.added_after_start ? <span className="isu-muted isu-small"> · added during count</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
