import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import usePosSetup from '../../hooks/usePosSetup.js';
import { saveItemContent, setPosPour } from '../../services/itemsurePosService.js';
import { ErrorNote } from './ItemsureUi.jsx';
import ItemsurePosAmountReview from './ItemsurePosAmountReview.jsx';
import ItemsurePosSizeReview from './ItemsurePosSizeReview.jsx';

/**
 * "Fix it" from Sales vs counts: what one item still needs (amounts each sale uses, then its
 * size), with ItemSure's guesses filled in. onChanged after each save; onClose when done.
 */
export default function ItemsurePosFixItem({ organizationId, itemId, onChanged, onClose }) {
  const [key, setKey] = useState(0);
  const { summary, error: loadError } = usePosSetup(organizationId, key);
  const { busy, error, run } = useItemsureAction();

  if (loadError) return <ErrorNote message={loadError} />;
  if (!summary) return <p className="isu-muted">Loading…</p>;
  const amounts = summary.amounts.filter((a) => a.item.id === itemId);
  const sizes = summary.sizes.filter((s) => s.item.id === itemId);

  const saved = (ok) => {
    if (!ok) return;
    setKey((k) => k + 1);
    onChanged?.();
  };
  const saveAmounts = async (list) => saved(await run(async () => {
    for (const { row, amount, unit } of list) await setPosPour(organizationId, row.pos.external_id, row.item.id, amount, unit);
  }));
  const saveSizes = async (list) => saved(await run(async () => {
    for (const { item, ml } of list) await saveItemContent(organizationId, item.id, Math.round(ml * 1000) / 1000);
  }));

  if (amounts.length) {
    return <ItemsurePosAmountReview key={`a-${key}`} rows={amounts} busy={busy} error={error} onSave={saveAmounts} onCancel={onClose} />;
  }
  if (sizes.length) {
    return <ItemsurePosSizeReview key={`s-${key}`} rows={sizes} busy={busy} error={error} onSave={saveSizes} onCancel={onClose} />;
  }
  return (
    <div className="isu-stack">
      <p>All set. Sales vs counts can now compare this item.</p>
      <div className="isu-pos-actions">
        <button type="button" className="isu-btn isu-btn--primary" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
