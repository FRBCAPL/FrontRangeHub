import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { setNotSoldInPos } from '../../services/itemsureItemPosSkipService.js';
import { cloverUsesFor } from '../../utils/itemsureItemClover.js';
import ItemsureItemNotSoldAsk from './ItemsureItemNotSoldAsk.jsx';

/**
 * Quiet Clover status under the item title: unmatched or skipped for sales counting.
 * The loud match work lives on the Sold in Clover tab.
 */
export default function ItemsureItemCloverNote({
  organizationId, itemId, itemName, notSoldInPos, data, hidden, canEdit, onMatch, onChanged,
}) {
  const { busy, error, run } = useItemsureAction();
  const [asking, setAsking] = useState(false);
  if (hidden || !data?.posItems?.length) return null;
  const uses = cloverUsesFor(itemId, data.posItems, data.links);
  if (uses.length) return null;

  const mark = () => run(async () => {
    await setNotSoldInPos(organizationId, itemId, true);
    setAsking(false);
    await onChanged?.();
  });
  const undo = () => run(async () => {
    await setNotSoldInPos(organizationId, itemId, false);
    await onChanged?.();
  });

  if (notSoldInPos) {
    return (
      <div className="isu-item-clover-note is-quiet" role="status">
        <p>Not tracked in sales</p>
        {canEdit ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={undo}>
            {busy ? 'Saving…' : 'Track in sales'}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="isu-item-clover-note is-quiet" role="status">
      <p>Sales aren&apos;t counted until this is matched in Clover.</p>
      {canEdit ? (
        <span className="isu-pos-mod-actions">
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onMatch}>Match</button>
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setAsking(true)}>
            Don&apos;t track in sales
          </button>
        </span>
      ) : (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onMatch}>See Clover</button>
      )}
      <ItemsureItemNotSoldAsk
        itemName={itemName}
        open={asking}
        busy={busy}
        error={error}
        onConfirm={mark}
        onClose={() => setAsking(false)}
      />
    </div>
  );
}
