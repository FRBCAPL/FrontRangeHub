import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { buildTodayTasks } from '../../utils/itemsureToday.js';
import { ITEM_MODAL_STATE, useItemLink } from '../../hooks/useItemModal.js';

const PATHS = {
  shopping: `${ITEMSURE_PATH}/restock`,
  count: (id) => `${ITEMSURE_PATH}/counts/${id}`,
  review: (id) => `${ITEMSURE_PATH}/counts/${id}/review`,
};

/** "Today": what needs doing now, most urgent first, one button each. `data` is from useTodayData. */
export default function ItemsureToday({ data, can, features }) {
  const canStock = can('inventory.view');
  const canCounts = can('counts.view');
  const itemLink = useItemLink();
  if (!canStock && !canCounts) return null;

  // Item tasks get a location object (the item window over this page); the rest are page paths.
  const paths = { ...PATHS, item: (id) => itemLink(id).to };
  const tasks = data.loaded
    ? buildTodayTasks({ ...data, canApprove: can('counts.approve'), showMoves: features.transfers, paths })
    : [];
  const noLevels = canStock && data.hasLevels === false;
  const clear = data.loaded && !tasks.length && !(canStock && data.recs === null);

  return (
    <section className="isu-card isu-today" aria-label="Today">
      <h2>Today</h2>
      {!data.loaded ? <p className="isu-muted">Checking what needs doing…</p> : null}
      {data.loaded && canStock && data.recs === null ? (
        <p className="isu-muted isu-small">Couldn&apos;t check stock levels just now. Open the shopping list to see them.</p>
      ) : null}
      {clear && !noLevels ? (
        <p className="isu-today-clear">You&apos;re all caught up. Nothing is running low and no counts are waiting.</p>
      ) : null}
      {clear && noLevels ? (
        <div className="isu-today-nolevels">
          <p>
            {canCounts ? 'No counts are waiting. ' : ''}ItemSure can&apos;t tell you what&apos;s running low yet, because no warning levels are set.
          </p>
          {can('inventory.targets.manage') ? (
            <Link to={`${ITEMSURE_PATH}/levels`} className="isu-btn isu-btn--ghost isu-btn--sm">Set warning levels</Link>
          ) : (
            <p className="isu-muted isu-small">Ask the owner or a manager to set them.</p>
          )}
        </div>
      ) : null}
      {tasks.length ? (
        <ul className="isu-today-list">
          {tasks.map((t) => (
            <li key={t.key} className={`isu-today-task is-${t.tone}`}>
              <div className="isu-today-text">
                <strong>{t.title}</strong>
                {t.detail ? <p className="isu-muted isu-small">{t.detail}</p> : null}
              </div>
              <Link to={t.to} state={typeof t.to === 'object' ? ITEM_MODAL_STATE : undefined} className="isu-btn isu-btn--primary isu-btn--sm">{t.button}</Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
