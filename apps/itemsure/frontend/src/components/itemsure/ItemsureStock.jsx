import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useStockData from '../../hooks/useStockData.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { spotName } from '../../utils/itemsureLocationStock.js';
import { site, sites, SITE } from '../../data/itemsureTerms.js';
import { ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureStockBalances from './ItemsureStockBalances.jsx';
import ItemsureStockActivity from './ItemsureStockActivity.jsx';
import ItemsureStockAdjustForm from './ItemsureStockAdjustForm.jsx';
import ItemsureStockTransferForm from './ItemsureStockTransferForm.jsx';
import ItemsureStockSpotActions from './ItemsureStockSpotActions.jsx';

/** On-hand stock per location, plus the activity that produced it. */
export default function ItemsureStock() {
  const { organization, features, can } = useItemsureWorkspace();
  const { data, error, reload } = useStockData(organization.id);
  const [tab, setTab] = useState('balances');
  const [params] = useSearchParams();
  const [locationId, setLocationId] = useState(() => params.get('location') || '');
  // modal: '' | 'adjust' | 'transfer' | 'spot'; preset fills the forms when opened from a spot.
  const [modal, setModal] = useState('');
  const [picked, setPicked] = useState(null);
  const [preset, setPreset] = useState(null);
  const [activityVersion, setActivityVersion] = useState(0);
  const canSeeActivity = can('inventory.activity');
  const canAdjust = can('inventory.adjust');
  const canMove = can('inventory.transfer') && features.transfers;

  const locations = useMemo(() => (data?.locations || []).filter((l) => l.is_active), [data]);
  useEffect(() => {
    if (locations.length && !locations.some((l) => l.id === locationId)) setLocationId(locations[0].id);
  }, [locations, locationId]);

  const closeModal = useCallback(() => {
    setModal('');
    setPreset(null);
  }, []);
  const afterChange = useCallback(async () => {
    setModal('');
    setPreset(null);
    setActivityVersion((v) => v + 1);
    notifyInventoryChanged();
    await reload();
  }, [reload]);

  const openForm = (kind) => {
    setPreset(null);
    setModal(kind);
  };
  const openSpot = (item, slot) => {
    setPicked({ item, slot });
    setModal('spot');
  };
  const pickAction = (kind) => {
    const { item, slot } = picked;
    setPreset({ itemId: item.id, locationId: slot.locationId, storageAreaId: slot.storageAreaId, direction: kind });
    setModal(kind === 'move' ? 'transfer' : 'adjust');
  };

  // Home quick actions: ?do=add or ?do=use opens Add / Use with that direction chosen, once.
  const wanted = params.get('do');
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (opened || !data || !canAdjust || (wanted !== 'add' && wanted !== 'use')) return;
    setOpened(true);
    setPreset({ direction: wanted === 'use' ? 'remove' : 'add' });
    setModal('adjust');
  }, [opened, data, canAdjust, wanted]);

  const location = locations.find((l) => l.id === locationId) || null;
  const actions = (
    <div className="isu-stock-actions">
      {canAdjust ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => openForm('adjust')}>Add / Use</button>
      ) : null}
      {canMove ? (
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => openForm('transfer')}>Move</button>
      ) : null}
    </div>
  );

  return (
    <div className="isu-page">
      <PageHead
        title={`Stock by ${site}`}
        description={`How many of everything you have at one ${site}. Tap a spot to add${canMove ? ', use, or move' : ' or use'}.`}
        action={actions}
      />
      <ErrorNote message={error} />
      {!data ? <p className="isu-muted">Loading…</p> : null}

      {data && !locations.length ? (
        <div className="isu-card isu-empty">
          <h2>No {sites}</h2>
          <p className="isu-muted">Add a {site}, then count it to set up stock.</p>
        </div>
      ) : null}

      {data && locations.length ? (
        <>
          {locations.length > 1 ? (
            <div className="isu-chip-row" role="group" aria-label={SITE}>
              {locations.map((l) => (
                <button key={l.id} type="button" className={`isu-chip isu-chip--choice${l.id === locationId ? ' is-selected' : ''}`} aria-pressed={l.id === locationId} onClick={() => setLocationId(l.id)}>
                  {l.name}
                </button>
              ))}
            </div>
          ) : null}

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

          {location && tab === 'balances' ? <ItemsureStockBalances location={location} data={data} onSpot={openSpot} /> : null}
          {location && tab === 'activity' && canSeeActivity ? (
            <ItemsureStockActivity key={`${location.id}:${activityVersion}`} organizationId={organization.id} location={location} locations={locations} />
          ) : null}
        </>
      ) : null}

      <Modal open={modal === 'spot'} title={picked ? `${picked.item.name} \u00b7 ${spotName(picked.slot)}` : ''} onClose={closeModal}>
        {picked && modal === 'spot' ? (
          <ItemsureStockSpotActions item={picked.item} slot={picked.slot} canAdjust={canAdjust} canMove={canMove} onPick={pickAction} />
        ) : null}
      </Modal>
      <Modal open={modal === 'adjust'} title="Add or use stock" onClose={closeModal}>
        {data && modal === 'adjust' ? <ItemsureStockAdjustForm data={data} defaultLocationId={locationId} preset={preset} onDone={afterChange} /> : null}
      </Modal>
      <Modal open={modal === 'transfer'} title="Move stock" onClose={closeModal}>
        {data && modal === 'transfer' ? <ItemsureStockTransferForm data={data} defaultLocationId={locationId} preset={preset} onDone={afterChange} /> : null}
      </Modal>
    </div>
  );
}
