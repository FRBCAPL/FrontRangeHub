import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listCatalog } from '../../services/itemsureItemService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemPlaces from '../../hooks/useItemPlaces.js';
import useItemStock from '../../hooks/useItemStock.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { addQuantity, itemSummary, visibleSlots } from '../../utils/itemsureItemStock.js';
import { canonicalQuantity, displayQuantity } from '../../utils/itemsureQuantity.js';
import { removeEmptyPlace, restorePlace } from '../../services/itemsurePlaceCleanup.js';
import { findBalance, NO_AREA_LABEL, parseSlotKey, slotKey, slotOptions } from '../../utils/itemsureStock.js';
import { ErrorNote, LoadFailed, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureItemPlaceRow from './ItemsureItemPlaceRow.jsx';
import ItemsureItemHistory from './ItemsureItemHistory.jsx';
import ItemsureSetAmountForm from './ItemsureSetAmountForm.jsx';
import ItemsureQuickChangeForm from './ItemsureQuickChangeForm.jsx';
import ItemsureSlotLevelsForm from './ItemsureSlotLevelsForm.jsx';
import ItemsureUndoBar from './ItemsureUndoBar.jsx';
import ItemsureItemUsage from './ItemsureItemUsage.jsx';
import useItemUsage from '../../hooks/useItemUsage.js';
import { suggestLevels } from '../../utils/itemsureUsage.js';

const TITLES = { set: 'Set amount', add: 'Add stock', remove: 'Use stock', levels: 'Warning and full-up levels' };

/** Everything about one item: how many and where, its levels, quick changes, and history. */
export default function ItemsureItemDetail() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { organization, features, can } = useItemsureWorkspace();
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [action, setAction] = useState(null);
  const [done, setDone] = useState(null);
  const [removeError, setRemoveError] = useState('');
  const clearDone = useCallback(() => setDone(null), []);
  const places = useItemPlaces(organization.id);
  const canView = can('inventory.view');
  const { stock } = useItemStock(organization.id, canView);
  const usage = useItemUsage(organization.id, itemId, canView && can('inventory.activity'));
  const allowed = {
    set: can('inventory.adjust') && can('counts.approve'),
    adjust: can('inventory.adjust'),
    levels: can('inventory.targets.manage'),
    items: can('items.manage'),
  };

  const load = useCallback(async () => {
    try {
      setCatalog(await listCatalog(organization.id));
      setLoadError('');
    } catch (e) {
      setLoadError(e.message);
    }
  }, [organization.id]);
  useEffect(() => {
    load();
  }, [load]);

  const raw = catalog?.items.find((i) => i.id === itemId) || null;
  const item = useMemo(() => {
    if (!raw) return null;
    const unit = catalog.units.find((u) => u.id === raw.base_unit_id);
    return { id: raw.id, name: raw.name, unitName: unit?.name || raw.unitName, unitSymbol: unit?.symbol || unit?.name || raw.unitName, precision: unit?.precision_scale ?? 0 };
  }, [raw, catalog]);

  const sources = { places: places.placesFor(itemId) || [], balances: stock?.balances || [], targets: stock?.targets || [], locations: places.locations };
  const groups = visibleSlots(itemId, sources);
  const summary = itemSummary(itemId, sources);
  const shown = new Set(groups.flatMap((g) => g.slots.map((s) => slotKey(s.locationId, s.storageAreaId))));
  const otherPlaces = slotOptions(places.locations, { spots: features.spots }).filter((o) => !shown.has(o.key));

  const labelFor = (slot) => {
    const location = places.locations.find((l) => l.id === slot.locationId);
    if (slot.storageAreaId) return `${location?.name} \u00b7 ${slot.areaName}`;
    const hasSpots = (location?.storageAreas || []).some((a) => a.is_active);
    const sharesLocation = groups.some((g) => g.location.id === slot.locationId && g.slots.length > 1);
    return hasSpots || sharesLocation ? `${location?.name} \u00b7 ${NO_AREA_LABEL}` : location?.name || 'Location';
  };
  const groupTotal = (group) =>
    group.slots.reduce((sum, s) => (s.quantity === null ? sum : addQuantity(sum, s.quantity)), null);
  const openOther = (key) => {
    if (!key) return;
    const { locationId, storageAreaId } = parseSlotKey(key);
    const location = places.locations.find((l) => l.id === locationId);
    const area = location?.storageAreas.find((a) => a.id === storageAreaId);
    // A hidden place may still hold a recorded 0; the database checks against it.
    const balance = findBalance(stock?.balances || [], itemId, locationId, storageAreaId || null);
    const quantity = balance ? canonicalQuantity(balance.quantity_text) : null;
    setAction({ kind: 'set', slot: { locationId, storageAreaId, areaName: area?.name || '', quantity, target: null } });
  };

  if (loadError) return <LoadFailed message={loadError} onRetry={load} />;
  if (!catalog) return <p className="isu-muted">Loading…</p>;
  if (!raw) {
    return (
      <div className="isu-card isu-empty">
        <h2>Item not found</h2>
        <Link to={`${ITEMSURE_PATH}/items`}>Back to items</Link>
      </div>
    );
  }

  const close = () => setAction(null);
  const finish = (result) => {
    setAction(null);
    if (result?.undo) setDone(result);
  };
  const formProps = action ? { item, slot: action.slot, placeName: labelFor(action.slot), onDone: finish } : null;

  const removePlace = async (slot) => {
    setRemoveError('');
    const label = labelFor(slot);
    try {
      const saved = await removeEmptyPlace(organization.id, raw.id, slot);
      await places.reload();
      setDone({
        message: `Removed ${label}.`,
        undo: async () => {
          await restorePlace(organization.id, raw.id, slot, saved);
          await places.reload();
        },
      });
    } catch (e) {
      setRemoveError(`Could not remove ${label}: ${e.message}`);
    }
  };

  return (
    <div className="isu-page">
      <Link to={`${ITEMSURE_PATH}/items`} className="isu-link isu-small">{'\u2190'} Inventory</Link>
      <PageHead
        title={raw.name}
        description={[`Counted in ${item.unitName}`, raw.categoryName, !raw.is_active && 'Archived'].filter(Boolean).join(' \u00b7 ')}
        action={can('items.manage') ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => navigate(`${ITEMSURE_PATH}/items/${raw.id}/edit`)}>Edit item</button>
        ) : null}
      />

      {!canView ? <p className="isu-muted">Your role doesn&apos;t include seeing stock amounts.</p> : null}

      {canView && summary.total !== null && groups.length > 1 ? (
        <p className="isu-item-total"><strong>{displayQuantity(summary.total)}</strong> {item.unitSymbol} in total at all locations</p>
      ) : null}
      {canView ? <ItemsureItemUsage usage={usage} total={summary.total} unit={item.unitSymbol} /> : null}

      {canView ? (
        <section className="isu-stack" aria-label="Where it is">
          <h2 className="isu-section-title">Where it is</h2>
          {stock === null ? <p className="isu-muted">Loading amounts…</p> : null}
          {stock && !groups.length ? (
            <p className="isu-muted">
              Not kept anywhere yet.{allowed.set ? ' Pick a place below to set how many are there.' : ''}
            </p>
          ) : null}
          <ErrorNote message={removeError} />
          <ul className="isu-place-list">
            {groups.map((g) => (
              <React.Fragment key={g.location.id}>
                {g.slots.length > 1 ? (
                  <li className="isu-place-location-total">
                    <strong>{g.location.name}</strong>: {groupTotal(g) === null ? 'no amounts yet' : (
                      <><strong>{displayQuantity(groupTotal(g))}</strong> {item.unitSymbol} in total across the {g.slots.length} places below</>
                    )}
                  </li>
                ) : null}
                {g.slots.map((slot) => (
                  <ItemsureItemPlaceRow
                    key={slot.key}
                    item={item}
                    slot={slot}
                    label={labelFor(slot)}
                    can={allowed}
                    perDay={usage ? usage.forSlot(slot.locationId, slot.storageAreaId) : null}
                    onAction={(kind, s) => (kind === 'removePlace' ? removePlace(s) : setAction({ kind, slot: s }))}
                  />
                ))}
              </React.Fragment>
            ))}
          </ul>
          {stock && allowed.set && otherPlaces.length ? (
            <select className="isu-other-place" value="" onChange={(e) => openOther(e.target.value)} aria-label="Set an amount at another place">
              <option value="">+ Set an amount at another place…</option>
              {otherPlaces.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          ) : null}
        </section>
      ) : null}

      {can('inventory.activity') ? (
        <section className="isu-stack" aria-label="History">
          <h2 className="isu-section-title">History</h2>
          <ItemsureItemHistory organizationId={organization.id} itemId={raw.id} locations={places.locations} />
        </section>
      ) : null}

      <Modal open={Boolean(action)} title={action ? TITLES[action.kind] : ''} onClose={close}>
        {action?.kind === 'set' ? <ItemsureSetAmountForm {...formProps} /> : null}
        {action?.kind === 'add' || action?.kind === 'remove' ? <ItemsureQuickChangeForm {...formProps} direction={action.kind} /> : null}
        {action?.kind === 'levels' ? (
          <ItemsureSlotLevelsForm
            {...formProps}
            organizationId={organization.id}
            usageReady={usage ? usage.enough : null}
            suggestion={usage ? suggestLevels(usage.forSlot(action.slot.locationId, action.slot.storageAreaId), item.precision) : null}
          />
        ) : null}
      </Modal>
      <ItemsureUndoBar done={done} onClose={clearDone} />
    </div>
  );
}
