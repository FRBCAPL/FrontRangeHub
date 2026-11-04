import React, { useCallback, useEffect, useState } from 'react';
import { getPosStockStatus } from '../../services/itemsurePosStockService.js';
import { formatWhen } from '../../utils/itemsureText.js';
import ItemsurePosTakeSales from './ItemsurePosTakeSales.jsx';

/** Home: the "Take sales off stock now" button, only when that's switched on and the person may use it. */
export default function ItemsureHomeSalesStock({ organizationId, can }) {
  const allowed = can('inventory.adjust') && (can('pos.manage') || can('inventory.activity'));
  const [status, setStatus] = useState(null);

  const load = useCallback(() => getPosStockStatus(organizationId).then(setStatus).catch(() => setStatus(null)), [organizationId]);
  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (!allowed || !status?.on) return null;
  return (
    <section className="isu-card isu-home-sales" aria-label="Clover sales">
      <div>
        <strong>Clover sales</strong>
        <p className="isu-muted isu-small">Taken off {status.location_name} stock up to {formatWhen(status.stock_through)}.</p>
      </div>
      <ItemsurePosTakeSales organizationId={organizationId} canFix={can('pos.manage') && can('items.manage')} onDone={load} />
    </section>
  );
}
