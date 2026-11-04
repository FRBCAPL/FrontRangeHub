import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { takeSalesOffStock } from '../../services/itemsurePosStockService.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { ErrorNote, Modal } from './ItemsureUi.jsx';
import ItemsurePosTakeResult from './ItemsurePosTakeResult.jsx';

/** "Take sales off stock now": brings in Clover sales, takes finished hours off, shows what happened. */
export default function ItemsurePosTakeSales({ organizationId, canFix, onDone, className = 'isu-btn isu-btn--primary isu-btn--sm' }) {
  const [result, setResult] = useState(null);
  const { busy, error, run } = useItemsureAction();

  const take = async () => {
    let done = null;
    if (await run(async () => {
      done = await takeSalesOffStock(organizationId);
    })) {
      setResult(done);
      if (!done.nothing) notifyInventoryChanged();
      onDone?.();
    }
  };

  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={take}>
        {busy ? 'Taking sales off…' : 'Take sales off stock now'}
      </button>
      <ErrorNote message={error} />
      <Modal open={!!result} title={result?.nothing ? 'Nothing new yet' : 'Sales taken off stock'} onClose={() => setResult(null)}>
        {result ? <ItemsurePosTakeResult result={result} canFix={canFix} onClose={() => setResult(null)} /> : null}
      </Modal>
    </>
  );
}
