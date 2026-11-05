import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { buildTodayTasks } from '../../utils/itemsureToday.js';
import { itemsNotOnClover } from '../../utils/itemsurePosMatch.js';
import { ITEM_MODAL_STATE, useItemLink } from '../../hooks/useItemModal.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import usePosSetup from '../../hooks/usePosSetup.js';
import useTodayClover from '../../hooks/useTodayClover.js';

const POS_SETUP = `${ITEMSURE_PATH}/settings/pos`;
const PATHS = {
  shopping: `${ITEMSURE_PATH}/restock`,
  count: (id) => `${ITEMSURE_PATH}/counts/${id}`,
  review: (id) => `${ITEMSURE_PATH}/counts/${id}/review`,
  itemsNoClover: `${ITEMSURE_PATH}/items?clover=unmatched`,
};

/** Clover numbers from the sales tracking setup, merged with connection and take-off status. */
function cloverFrom(pos, status) {
  const setup = pos && !pos.off && pos.ready
    ? {
      amounts: pos.amounts.length,
      guessed: pos.amounts.filter((a) => a.suggestion).length,
      sizes: pos.sizes.length,
      unmatchedButtons: pos.unmatched,
      unmatchedItems: itemsNotOnClover(pos.items, pos.matchedItemIds).length,
    }
    : null;
  return setup || status ? { ...(setup || {}), ...(status || {}) } : null;
}

/** "Today": what needs doing now, most urgent first, one button each. `data` is from useTodayData. */
export default function ItemsureToday({ data, can, features }) {
  const { organization } = useItemsureWorkspace();
  const canStock = can('inventory.view');
  const canCounts = can('counts.view');
  const canPosSetup = can('pos.manage') && can('items.manage');
  const canTake = can('inventory.adjust') && (can('pos.manage') || can('inventory.activity'));
  const itemLink = useItemLink();
  const pos = usePosSetup(organization.id, 0, { enabled: canPosSetup, needsConnection: true }).summary;
  const cloverStatus = useTodayClover(organization.id, { manage: canPosSetup, take: canTake });
  if (!canStock && !canCounts) return null;

  // Item tasks get a location object (the item window over this page); the rest are page paths.
  const paths = { ...PATHS, item: (id) => itemLink(id).to, posSetup: canPosSetup ? POS_SETUP : null };
  const tasks = data.loaded
    ? buildTodayTasks({ ...data, canApprove: can('counts.approve'), showMoves: features.transfers, clover: cloverFrom(pos, cloverStatus), paths })
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
              {t.to ? (
                <Link to={t.to} state={typeof t.to === 'object' ? ITEM_MODAL_STATE : undefined} className="isu-btn isu-btn--primary isu-btn--sm">{t.button}</Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
