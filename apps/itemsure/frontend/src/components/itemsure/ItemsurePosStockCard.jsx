import React, { useCallback, useEffect, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { getPosStockStatus, setPosStock } from '../../services/itemsurePosStockService.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { Card, ErrorNote } from './ItemsureUi.jsx';
import ItemsurePosSpotOrder from './ItemsurePosSpotOrder.jsx';
import ItemsurePosTakeSales from './ItemsurePosTakeSales.jsx';

const TURN_ON = 'Turn on? From the next full hour, Clover sales come off stock each time someone taps "Take sales off stock now". Earlier sales are never taken off.';
const TURN_OFF = 'Turn off? Sales already taken off stay that way. If you turn it on again, it starts fresh from that moment.';

/** Settings → Point of sale: take Clover sales off stock (on/off, spot order, take now). */
export default function ItemsurePosStockCard({ organizationId, locationId, can }) {
  const [status, setStatus] = useState(null);
  const { busy, error, run } = useItemsureAction();
  const canManage = can('pos.manage');

  const load = useCallback(() => getPosStockStatus(organizationId).then(setStatus).catch(() => setStatus({ failed: true })), [organizationId]);
  useEffect(() => {
    load();
  }, [load, locationId]);

  if (!status || status.failed) return null;
  if (status.missing) {
    return (
      <Card title="Take sales off stock">
        <p className="isu-muted">Taking sales off stock needs a database update first. Nothing else is affected.</p>
      </Card>
    );
  }
  if (!status.location_id) return null;

  const toggle = async () => {
    if (!window.confirm(status.on ? TURN_OFF : TURN_ON)) return;
    if (await run(() => setPosStock(organizationId, !status.on))) await load();
  };
  const last = status.last_run;

  return (
    <Card title="Take sales off stock">
      <p className="isu-muted isu-small">
        Clover sales come off {status.location_name}&apos;s stock when someone taps the button, so the stock on hand stays close between counts.
        Refunded drinks still come off (they were usually made); voided ones don&apos;t.
      </p>
      <div className="isu-pos-stock-state">
        <strong>{status.on ? 'On' : 'Off'}</strong>
        {canManage ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={toggle}>{status.on ? 'Turn off' : 'Turn on'}</button>
        ) : null}
      </div>
      <ErrorNote message={error} />
      {status.on ? (
        <>
          <p className="isu-small">
            {last ? `Sales taken off up to ${formatWhen(status.stock_through)}.` : `Starts with sales after ${formatWhen(status.stock_through)}.`}
            {last ? <span className="isu-muted"> Last tapped {formatWhen(last.ran_at)}.</span> : null}
          </p>
          {can('inventory.adjust') ? <ItemsurePosTakeSales organizationId={organizationId} canFix={can('items.manage')} onDone={load} /> : null}
          <ItemsurePosSpotOrder organizationId={organizationId} locationId={status.location_id} canEdit={canManage} />
        </>
      ) : null}
    </Card>
  );
}
