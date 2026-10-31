import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCatalog } from '../../services/itemsureItemService.js';
import { detailsLine, variantLabelFor } from '../../utils/itemsureItemDetails.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemPlaces from '../../hooks/useItemPlaces.js';
import useItemStock from '../../hooks/useItemStock.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { SITE } from '../../data/itemsureTerms.js';
import { addQuantity, itemSummary, visibleSlots } from '../../utils/itemsureItemStock.js';
import { canonicalQuantity, displayQuantity } from '../../utils/itemsureQuantity.js';
import { removeEmptyPlace, restorePlace } from '../../services/itemsurePlaceCleanup.js';
import { findBalance, NO_AREA_LABEL, parseSlotKey, slotKey, slotOptions } from '../../utils/itemsureStock.js';
import { ErrorNote, LoadFailed, Modal } from './ItemsureUi.jsx';
import ItemsureItemPlaceRow from './ItemsureItemPlaceRow.jsx';
import ItemsureItemHistory from './ItemsureItemHistory.jsx';
import ItemsureUndoBar from './ItemsureUndoBar.jsx';
import ItemsureItemSummary from './ItemsureItemSummary.jsx';
import ItemsureItemCountButton from './ItemsureItemCountButton.jsx';
import ItemsureItemInfo from './ItemsureItemInfo.jsx';
import ItemsureTabs from './ItemsureTabs.jsx';
import useOpenCounts from '../../hooks/useOpenCounts.js';
import useSuppliers from '../../hooks/useSuppliers.js';
import ItemsurePlacePicker from './ItemsurePlacePicker.jsx';
import useItemUsage from '../../hooks/useItemUsage.js';
import ItemsureItemAction, { ACTION_TITLES } from './ItemsureItemAction.jsx';

/**
 * Everything about one item in a window: a summary, then tabs for its places, history, and
 * details. Setting an amount or levels swaps the window's content, with a way back.
 */
export default function ItemsureItemModal({ itemId, onClose }) {
  const navigate = useNavigate();
  const { organization, features, can } = useItemsureWorkspace();
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [action, setAction] = useState(null);
  const [done, setDone] = useState(null);
  const [removeError, setRemoveError] = useState('');
  const [toggled, setToggled] = useState(() => new Set());
  const [chosenTab, setChosenTab] = useState('');
  const clearDone = useCallback(() => setDone(null), []);
  const places = useItemPlaces(organization.id);
  const canView = can('inventory.view');
  const canHistory = can('inventory.activity');
  const { stock } = useItemStock(organization.id, canView);
  const usage = useItemUsage(organization.id, itemId, canView && canHistory);
  const openCounts = useOpenCounts(organization.id, can('counts.view') || can('counts.edit'));
  const suppliers = useSuppliers(organization.id);
  const allowed = {
    set: can('inventory.adjust') && can('counts.approve'),
    adjust: can('inventory.adjust'),
    levels: can('inventory.targets.manage'),
    items: can('items.manage'),
  };

  const tabs = [
    canView && { id: 'stock', label: 'Stock' },
    canHistory && { id: 'history', label: 'History' },
    { id: 'details', label: 'Details' },
  ].filter(Boolean);
  const tab = tabs.some((t) => t.id === chosenTab) ? chosenTab : tabs[0].id;

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
  useEffect(() => {
    setAction(null);
    setToggled(new Set());
    setChosenTab('');
  }, [itemId]);

  const raw = catalog?.items.find((i) => i.id === itemId) || null;
  const item = useMemo(() => {
    if (!raw) return null;
    const unit = catalog.units.find((u) => u.id === raw.base_unit_id);
    return { id: raw.id, name: raw.name, unitName: unit?.name || raw.unitName, unitSymbol: unit?.symbol || unit?.name || raw.unitName, precision: unit?.precision_scale ?? 0 };
  }, [raw, catalog]);

  const sources = { places: places.placesFor(itemId) || [], balances: stock?.balances || [], targets: stock?.targets || [], locations: places.locations };
  const groups = visibleSlots(itemId, sources);
  const summary = itemSummary(itemId, sources);
  const slotCount = groups.reduce((n, g) => n + g.slots.length, 0);
  const shown = new Set(groups.flatMap((g) => g.slots.map((s) => slotKey(s.locationId, s.storageAreaId))));
  const otherPlaces = slotOptions(places.locations, { spots: features.spots }).filter((o) => !shown.has(o.key));
  // With a single place it starts open; otherwise rows start closed.
  const isOpen = (key) => (slotCount === 1 ? !toggled.has(key) : toggled.has(key));
  const toggle = (key) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const labelFor = (slot) => {
    const location = places.locations.find((l) => l.id === slot.locationId);
    if (slot.storageAreaId) return `${location?.name} \u00b7 ${slot.areaName}`;
    const hasSpots = (location?.storageAreas || []).some((a) => a.is_active);
    const sharesLocation = groups.some((g) => g.location.id === slot.locationId && g.slots.length > 1);
    return hasSpots || sharesLocation ? `${location?.name} \u00b7 ${NO_AREA_LABEL}` : location?.name || SITE;
  };
  const rowLabel = (slot, group) => (group.slots.length > 1 ? slot.areaName || NO_AREA_LABEL : labelFor(slot));
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

  const finish = (result) => {
    setAction(null);
    if (result?.undo) setDone(result);
  };
  const editItem = can('items.manage') && raw ? () => navigate(`${ITEMSURE_PATH}/items/${raw.id}/edit`) : null;

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

  const title = action ? ACTION_TITLES[action.kind] : raw?.name || 'Item';
  let body;
  if (loadError) body = <LoadFailed message={loadError} onRetry={load} />;
  else if (!catalog) body = <p className="isu-muted">Loading…</p>;
  else if (!raw) body = <p className="isu-muted">This item was not found. It may have been deleted.</p>;
  else if (action) {
    body = (
      <ItemsureItemAction
        action={action}
        item={item}
        itemName={raw.name}
        placeName={labelFor(action.slot)}
        organizationId={organization.id}
        openCounts={openCounts}
        usage={usage}
        onDone={finish}
        onBack={() => setAction(null)}
      />
    );
  } else {
    const showDetails = Boolean(features.details && catalog.detailsAvailable);
    const description = [showDetails && detailsLine(raw), raw.categoryName, !raw.is_active && 'Archived'].filter(Boolean).join(' \u00b7 ');
    body = (
      <div className="isu-stack isu-item-modal">
        {description || editItem ? (
          <div className="isu-item-modal-head">
            <p className="isu-muted isu-small">{description}</p>
            {editItem ? <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={editItem}>Edit item</button> : null}
          </div>
        ) : null}

        {canView ? (
          <ItemsureItemSummary item={raw} summary={summary} usage={usage} unitSymbol={item.unitSymbol} placeCount={stock ? slotCount : null} supplier={suppliers.supplierFor(raw.id)}>
            <ItemsureItemCountButton organizationId={organization.id} item={raw} counts={openCounts} keptAt={groups} precision={item.precision} can={can} />
          </ItemsureItemSummary>
        ) : (
          <p className="isu-muted">Your role doesn&apos;t include seeing stock amounts.</p>
        )}

        {tabs.length > 1 ? <ItemsureTabs tabs={tabs} selected={tab} onSelect={setChosenTab} label="Item sections" /> : null}

        {tab === 'stock' ? (
          <section className="isu-stack" aria-label="Where it is">
            {stock === null ? <p className="isu-muted">Loading amounts…</p> : null}
            {stock && !groups.length ? (
              <p className="isu-muted">
                Not kept anywhere yet.{allowed.set ? ' Use the button below to pick where, and set how many are there.' : ''}
              </p>
            ) : null}
            <ErrorNote message={removeError} />
            <ul className="isu-place-list">
              {groups.map((g) => (
                <React.Fragment key={g.location.id}>
                  {g.slots.length > 1 ? (
                    <li className="isu-place-location-total">
                      <strong>{g.location.name}</strong>
                      <span>{groupTotal(g) === null ? 'no amounts yet' : <><strong>{displayQuantity(groupTotal(g))}</strong> {item.unitSymbol} in {g.slots.length} spots</>}</span>
                    </li>
                  ) : null}
                  {g.slots.map((slot) => (
                    <ItemsureItemPlaceRow
                      key={slot.key}
                      item={item}
                      slot={slot}
                      label={rowLabel(slot, g)}
                      can={allowed}
                      perDay={usage ? usage.forSlot(slot.locationId, slot.storageAreaId) : null}
                      open={isOpen(slot.key)}
                      onToggle={() => toggle(slot.key)}
                      onAction={(kind, s) => (kind === 'removePlace' ? removePlace(s) : setAction({ kind, slot: s }))}
                    />
                  ))}
                </React.Fragment>
              ))}
            </ul>
            {stock && allowed.set ? (
              <ItemsurePlacePicker label="Set an amount somewhere else" options={otherPlaces} onPick={openOther} />
            ) : null}
          </section>
        ) : null}

        {tab === 'history' ? (
          <section className="isu-stack" aria-label="History">
            <ItemsureItemHistory organizationId={organization.id} itemId={raw.id} locations={places.locations} />
          </section>
        ) : null}

        {tab === 'details' ? (
          <ItemsureItemInfo organizationId={organization.id} item={raw} unitName={item.unitName} showPackaging={features.packaging} variantLabel={showDetails ? variantLabelFor(organization) : ''} onEdit={editItem} />
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Modal open title={title} onClose={onClose} className="isu-modal--item">
        {body}
      </Modal>
      <ItemsureUndoBar done={done} onClose={clearDone} />
    </>
  );
}
