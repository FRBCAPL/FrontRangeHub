import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { getPosConnection } from '../../services/itemsurePosService.js';
import { pickPosTab, POS_TABS } from '../../utils/itemsurePosTabs.js';
import { Card } from './ItemsureUi.jsx';
import ItemsurePosConnectForm from './ItemsurePosConnectForm.jsx';
import ItemsurePosConnection from './ItemsurePosConnection.jsx';
import ItemsurePosLeft from './ItemsurePosLeft.jsx';
import ItemsurePosMatch from './ItemsurePosMatch.jsx';
import ItemsurePosSetup from './ItemsurePosSetup.jsx';
import ItemsurePosStockCard from './ItemsurePosStockCard.jsx';
import ItemsurePosAutoSync from './ItemsurePosAutoSync.jsx';
import ItemsurePosModifiers from './ItemsurePosModifiers.jsx';

/**
 * Settings → Point of sale, in tabs in the order people set things up: what's left, Clover
 * buttons, pour sizes, add-ons, stock, connection. ?tab= picks one (see itemsurePosTabs.js).
 */
export default function ItemsureSettingsPos() {
  const { organization, can } = useItemsureWorkspace();
  const [state, setState] = useState(null);
  const [menuKey, setMenuKey] = useState(0);
  const [params, setParams] = useSearchParams();

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
  if (!c) {
    return (
      <Card title="Connect Clover">
        <ItemsurePosConnectForm organizationId={organization.id} onConnected={load} />
      </Card>
    );
  }

  const sales = state.salesReady;
  const offered = POS_TABS.filter((t) => {
    if (t.key === 'addons') return sales && (can('inventory.activity') || can('items.manage'));
    if (t.key === 'stock') return sales;
    return true;
  });
  const tab = pickPosTab(params.get('tab'), offered.map((t) => t.key));
  const go = (key) => {
    setParams({ tab: key }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="isu-stack">
      <div className="isu-pos-tabs" role="tablist" aria-label="Point of sale">
        {offered.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`isu-chip${tab === t.key ? ' is-active' : ''}`} onClick={() => go(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'left' ? <ItemsurePosLeft organizationId={organization.id} can={can} salesReady={sales} onGo={go} /> : null}
      {tab === 'buttons' ? (
        <Card title="Clover buttons">
          <ItemsurePosMatch organizationId={organization.id} canMatch={can('items.manage')} reloadKey={menuKey} />
        </Card>
      ) : null}
      {tab === 'pours' ? <ItemsurePosSetup organizationId={organization.id} canEdit={can('items.manage')} reloadKey={menuKey} /> : null}
      {tab === 'addons' ? <ItemsurePosModifiers organizationId={organization.id} canEdit={can('items.manage')} /> : null}
      {tab === 'stock' ? (
        <>
          {c.location_id ? (
            <ItemsurePosStockCard organizationId={organization.id} locationId={c.location_id} can={can} />
          ) : (
            <Card title="Take sales off stock">
              <p className="isu-muted">First pick which site Clover sells from on the Connection tab.</p>
            </Card>
          )}
          <ItemsurePosAutoSync organizationId={organization.id} canManage={can('pos.manage')} siteKey={c.location_id || ''} />
        </>
      ) : null}
      {tab === 'connection' ? (
        <ItemsurePosConnection
          organizationId={organization.id}
          connection={c}
          salesReady={sales}
          canPickSite={can('pos.manage')}
          onChanged={load}
          onMenu={() => setMenuKey((k) => k + 1)}
        />
      ) : null}
    </div>
  );
}
