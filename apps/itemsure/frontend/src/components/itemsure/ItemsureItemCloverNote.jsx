import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { setNotSoldInPos } from '../../services/itemsureItemPosSkipService.js';
import { cloverUsesFor } from '../../utils/itemsureItemClover.js';
import ItemsureItemNotSoldAsk from './ItemsureItemNotSoldAsk.jsx';

/**
 * On the item window: if Clover is connected and this item isn't matched yet, a heads-up.
 * Kitchen and supply items can be marked not sold in Clover so we stop asking.
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
        <p>Marked as not sold in Clover, so ItemSure won&apos;t ask you to match {itemName}.</p>
        {canEdit ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={undo}>
            {busy ? 'Saving…' : 'Undo: it is sold in Clover'}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="isu-item-clover-note" role="status">
      <p>No Clover button is matched to {itemName} yet, so its sales aren&apos;t counted.</p>
      {canEdit ? (
        <span className="isu-pos-mod-actions">
          <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={onMatch}>Match to Clover</button>
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={() => setAsking(true)}>
            Not sold in Clover
          </button>
        </span>
      ) : (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onMatch}>See Sold in Clover</button>
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
