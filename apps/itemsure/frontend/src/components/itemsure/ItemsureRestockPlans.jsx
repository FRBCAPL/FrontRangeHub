import React from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { cancelPlan } from '../../services/itemsureRestockService.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { slotLabel } from '../../utils/itemsureStock.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { ErrorNote } from './ItemsureUi.jsx';

/** Open planned transfers. Plans reserve nothing; completing one runs a real transfer. */
export default function ItemsureRestockPlans({ plans, data, canTransfer, onComplete, onChanged }) {
  const { busy, error, run } = useItemsureAction();
  const visibleIds = new Set(data.locations.map((l) => l.id));
  if (!plans.length) return null;

  const cancel = (plan) =>
    run(async () => {
      await cancelPlan(plan.id);
      await onChanged();
    });

  return (
    <section className="isu-restock-group">
      <h2>Planned transfers <span className="isu-muted isu-small">({plans.length})</span></h2>
      <p className="isu-muted isu-small">Plans are reminders. They don&apos;t hold stock, and nothing moves until someone completes them.</p>
      <ErrorNote message={error} />
      <ul className="isu-levels-list">
        {plans.map((plan) => {
          const item = data.items.find((i) => i.id === plan.item_id);
          const canComplete = canTransfer && item && visibleIds.has(plan.from_location_id) && visibleIds.has(plan.to_location_id);
          return (
            <li key={plan.id} className="isu-card isu-plan-row">
              <div>
                <p><strong>{item?.name || 'Item'}</strong> · {displayQuantity(plan.quantity_text)} {item?.unitSymbol || ''}</p>
                <p className="isu-muted isu-small">
                  {slotLabel(data.locations, plan.from_location_id, plan.from_storage_area_id)} → {slotLabel(data.locations, plan.to_location_id, plan.to_storage_area_id)}
                </p>
                <p className="isu-muted isu-small">Planned {formatWhen(plan.created_at)}{plan.note ? ` · ${plan.note}` : ''}</p>
              </div>
              {canTransfer ? (
                <div className="isu-restock-move-actions">
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => cancel(plan)}>Cancel plan</button>
                  {canComplete ? (
                    <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={() => onComplete(plan, item)}>Complete</button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
