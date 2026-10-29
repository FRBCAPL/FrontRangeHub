import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import useTodayData from '../../hooks/useTodayData.js';
import { buildTodayTasks } from '../../utils/itemsureToday.js';

const PATHS = {
  item: (id) => `${ITEMSURE_PATH}/items/${id}`,
  shopping: `${ITEMSURE_PATH}/restock`,
  count: (id) => `${ITEMSURE_PATH}/counts/${id}`,
  review: (id) => `${ITEMSURE_PATH}/counts/${id}/review`,
};

/** "Today": what needs doing now, most urgent first, one button each. */
export default function ItemsureToday({ organizationId, can, features }) {
  const canStock = can('inventory.view');
  const canCounts = can('counts.view');
  const data = useTodayData(organizationId, { stock: canStock, counts: canCounts });
  if (!canStock && !canCounts) return null;

  const tasks = data.loaded
    ? buildTodayTasks({ ...data, canApprove: can('counts.approve'), showMoves: features.transfers, paths: PATHS })
    : [];

  return (
    <section className="isu-card isu-today" aria-label="Today">
      <h2>Today</h2>
      {!data.loaded ? <p className="isu-muted">Checking what needs doing…</p> : null}
      {data.loaded && canStock && data.recs === null ? (
        <p className="isu-muted isu-small">Couldn&apos;t check stock levels just now. Open the shopping list to see them.</p>
      ) : null}
      {data.loaded && !tasks.length && !(canStock && data.recs === null) ? (
        <p className="isu-today-clear">You&apos;re all caught up. Nothing is running low and no counts are waiting.</p>
      ) : null}
      {tasks.length ? (
        <ul className="isu-today-list">
          {tasks.map((t) => (
            <li key={t.key} className={`isu-today-task is-${t.tone}`}>
              <div className="isu-today-text">
                <strong>{t.title}</strong>
                {t.detail ? <p className="isu-muted isu-small">{t.detail}</p> : null}
              </div>
              <Link to={t.to} className="isu-btn isu-btn--primary isu-btn--sm">{t.button}</Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
