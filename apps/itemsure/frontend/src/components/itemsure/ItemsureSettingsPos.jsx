import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { checkClover, disconnectClover, getPosConnection, syncCloverItems } from '../../services/itemsurePosService.js';
import { Card, ErrorNote } from './ItemsureUi.jsx';
import ItemsurePosConnectForm from './ItemsurePosConnectForm.jsx';
import ItemsurePosMatch from './ItemsurePosMatch.jsx';
import ItemsurePosSitePick from './ItemsurePosSitePick.jsx';

const when = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

/** Settings → Point of sale: connect Clover, bring in its items, and match them to ItemSure items. */
export default function ItemsureSettingsPos() {
  const { organization, can } = useItemsureWorkspace();
  const [state, setState] = useState(null);
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { busy, error, run } = useItemsureAction();

  const load = useCallback(async () => setState(await getPosConnection(organization.id)), [organization.id]);
  useEffect(() => {
    load();
  }, [load]);

  if (!state) return <p className="isu-muted">Loading…</p>;
  if (state.missing) {
    return (
      <Card>
        <h2>Almost ready</h2>
        <p className="isu-muted">Connecting a point of sale needs a database update first. Nothing else is affected.</p>
      </Card>
    );
  }

  const c = state.connection;
  const act = (action, message) => async () => {
    setNotice('');
    if (await run(action)) setNotice(typeof message === 'function' ? message() : message);
    await load();
  };
  let synced = null;
  const bringIn = act(async () => {
    synced = await syncCloverItems(organization.id);
    setReloadKey((k) => k + 1);
  }, () => `Brought in ${synced?.count ?? 0} Clover items${synced?.removed ? `; ${synced.removed} no longer in Clover` : ''}.`);
  const disconnect = async () => {
    if (!window.confirm('Disconnect Clover? Your matches are kept, and you can connect again any time.')) return;
    await act(() => disconnectClover(organization.id), 'Clover is disconnected.')();
  };

  if (!c) {
    return (
      <Card title="Connect Clover">
        <ItemsurePosConnectForm organizationId={organization.id} onConnected={load} />
      </Card>
    );
  }

  return (
    <div className="isu-stack">
      <Card title="Clover">
        <p>
          <strong>{c.merchant_name || 'Clover'}</strong>
          <span className="isu-muted"> · {c.environment === 'sandbox' ? 'Sandbox' : 'Live'} · Merchant {c.merchant_id}</span>
        </p>
        {c.status === 'error' ? (
          <p className="isu-error" role="alert">{c.last_error || 'Clover stopped answering.'} If the token was deleted, disconnect and connect again with a new one.</p>
        ) : (
          <p className="isu-muted isu-small">Connected. {c.items_synced_at ? `Items last brought in ${when(c.items_synced_at)}.` : 'Items not brought in yet.'}</p>
        )}
        {notice ? <p className="isu-notice" role="status">{notice}</p> : null}
        <ErrorNote message={error} />
        <div className="isu-pos-actions">
          <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy} onClick={bringIn}>
            {busy ? 'Working…' : c.items_synced_at ? 'Bring in Clover items again' : 'Bring in Clover items'}
          </button>
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={act(() => checkClover(organization.id), 'Clover is answering.')}>Test connection</button>
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={disconnect}>Disconnect</button>
        </div>
        {state.salesReady ? (
          <>
            <ItemsurePosSitePick organizationId={organization.id} locationId={c.location_id} canEdit={can('pos.manage')} onSaved={load} />
            {can('inventory.activity') ? (
              <Link to={`${ITEMSURE_PATH}/sales-vs-counts`} className="isu-link isu-small">See sales vs counts {'\u203A'}</Link>
            ) : null}
          </>
        ) : null}
      </Card>
      <Card title="Match Clover items">
        <ItemsurePosMatch organizationId={organization.id} canMatch={can('items.manage')} reloadKey={reloadKey} />
      </Card>
    </div>
  );
}
