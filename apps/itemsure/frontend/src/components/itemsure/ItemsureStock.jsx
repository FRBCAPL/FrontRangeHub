import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useStockData from '../../hooks/useStockData.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureStockBalances from './ItemsureStockBalances.jsx';
import ItemsureStockActivity from './ItemsureStockActivity.jsx';
import ItemsureStockAdjustForm from './ItemsureStockAdjustForm.jsx';
import ItemsureStockTransferForm from './ItemsureStockTransferForm.jsx';

/** On-hand stock per location, plus the activity that produced it. */
export default function ItemsureStock() {
  const { organization, can } = useItemsureWorkspace();
  const { data, error, reload } = useStockData(organization.id);
  const [tab, setTab] = useState('balances');
  const [params] = useSearchParams();
  const [locationId, setLocationId] = useState(() => params.get('location') || '');
  const [modal, setModal] = useState('');
  const [activityVersion, setActivityVersion] = useState(0);
  const canSeeActivity = can('inventory.activity');

  const locations = useMemo(() => (data?.locations || []).filter((l) => l.is_active), [data]);
  useEffect(() => {
    if (locations.length && !locations.some((l) => l.id === locationId)) setLocationId(locations[0].id);
  }, [locations, locationId]);

  const closeModal = useCallback(() => setModal(''), []);
  const afterChange = useCallback(async () => {
    setModal('');
    setActivityVersion((v) => v + 1);
    notifyInventoryChanged();
    await reload();
  }, [reload]);

  const location = locations.find((l) => l.id === locationId) || null;
  const actions = (
    <div className="isu-stock-actions">
      {can('inventory.adjust') ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setModal('adjust')}>Adjust</button>
      ) : null}
      {can('inventory.transfer') ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setModal('transfer')}>Transfer</button>
      ) : null}
    </div>
  );

  return (
    <div className="isu-page">
      <PageHead title="Stock" description="On-hand quantities from approved counts and recorded changes." action={actions} />
      <ErrorNote message={error} />
      {!data ? <p className="isu-muted">Loading…</p> : null}

      {data && !locations.length ? (
        <div className="isu-card isu-empty">
          <h2>No locations</h2>
          <p className="isu-muted">Add a location, then count it to set up stock.</p>
        </div>
      ) : null}

      {data && locations.length ? (
        <>
          {canSeeActivity ? (
            <div className="isu-tabs" role="tablist" aria-label="Stock views">
              <button type="button" role="tab" aria-selected={tab === 'balances'} className={`isu-tab${tab === 'balances' ? ' is-active' : ''}`} onClick={() => setTab('balances')}>
                On hand
              </button>
              <button type="button" role="tab" aria-selected={tab === 'activity'} className={`isu-tab${tab === 'activity' ? ' is-active' : ''}`} onClick={() => setTab('activity')}>
                Activity
              </button>
            </div>
          ) : null}

          {locations.length > 1 ? (
            <div className="isu-chip-row" role="group" aria-label="Location">
              {locations.map((l) => (
                <button key={l.id} type="button" className={`isu-chip isu-chip--choice${l.id === locationId ? ' is-selected' : ''}`} aria-pressed={l.id === locationId} onClick={() => setLocationId(l.id)}>
                  {l.name}
                </button>
              ))}
            </div>
          ) : null}

          {location && tab === 'balances' ? <ItemsureStockBalances location={location} items={data.items} balances={data.balances} /> : null}
          {location && tab === 'activity' && canSeeActivity ? (
            <ItemsureStockActivity key={`${location.id}:${activityVersion}`} organizationId={organization.id} location={location} locations={locations} />
          ) : null}
        </>
      ) : null}

      <Modal open={modal === 'adjust'} title="Adjust stock" onClose={closeModal}>
        {data ? <ItemsureStockAdjustForm data={data} defaultLocationId={locationId} onDone={afterChange} /> : null}
      </Modal>
      <Modal open={modal === 'transfer'} title="Transfer stock" onClose={closeModal}>
        {data ? <ItemsureStockTransferForm data={data} defaultLocationId={locationId} onDone={afterChange} /> : null}
      </Modal>
    </div>
  );
}
