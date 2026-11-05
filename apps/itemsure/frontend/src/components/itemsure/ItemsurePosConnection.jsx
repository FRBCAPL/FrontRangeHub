import React, { useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { checkClover, disconnectClover, syncCloverItems } from '../../services/itemsurePosService.js';
import { Card, ErrorNote } from './ItemsureUi.jsx';
import ItemsurePosSitePick from './ItemsurePosSitePick.jsx';

const when = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

/**
 * Point of sale → Connection: Clover status, get the menu from Clover, test, disconnect, and
 * which site Clover sells from. onChanged after anything here changes; onMenu after the menu
 * is brought in. ItemSure only reads from Clover.
 */
export default function ItemsurePosConnection({ organizationId, connection: c, salesReady, canPickSite, onChanged, onMenu }) {
  const [notice, setNotice] = useState('');
  const { busy, error, run } = useItemsureAction();

  const act = (action, message) => async () => {
    setNotice('');
    if (await run(action)) setNotice(typeof message === 'function' ? message() : message);
    await onChanged();
  };
  let synced = null;
  const getMenu = act(async () => {
    synced = await syncCloverItems(organizationId);
    onMenu();
  }, () => `Got ${synced?.count ?? 0} buttons from Clover${synced?.removed ? `; ${synced.removed} no longer in Clover` : ''}.`);
  const disconnect = async () => {
    if (!window.confirm('Disconnect Clover? Your links are kept, and you can connect again any time.')) return;
    await act(() => disconnectClover(organizationId), 'Clover is disconnected.')();
  };

  return (
    <Card title="Connection">
      <p>
        <strong>{c.merchant_name || 'Clover'}</strong>
        <span className="isu-muted"> · {c.environment === 'sandbox' ? 'Sandbox' : 'Live'} · Merchant {c.merchant_id}</span>
      </p>
      {c.status === 'error' ? (
        <p className="isu-error" role="alert">{c.last_error || 'Clover stopped answering.'} If the token was deleted, disconnect and connect again with a new one.</p>
      ) : (
        <p className="isu-muted isu-small">Connected. {c.items_synced_at ? `Menu last brought in ${when(c.items_synced_at)}.` : 'Menu not brought in yet.'}</p>
      )}
      {notice ? <p className="isu-notice" role="status">{notice}</p> : null}
      <ErrorNote message={error} />
      <div className="isu-pos-actions">
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={getMenu}>
          {busy ? 'Working…' : c.items_synced_at ? 'Refresh menu from Clover' : 'Get menu from Clover'}
        </button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={act(() => checkClover(organizationId), 'Clover is answering.')}>Test connection</button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={disconnect}>Disconnect</button>
      </div>
      <p className="isu-muted isu-small">Refreshing brings in new or changed Clover buttons. ItemSure only reads from Clover and never changes it.</p>
      {salesReady ? <ItemsurePosSitePick organizationId={organizationId} locationId={c.location_id} canEdit={canPickSite} onSaved={onChanged} /> : null}
    </Card>
  );
}
