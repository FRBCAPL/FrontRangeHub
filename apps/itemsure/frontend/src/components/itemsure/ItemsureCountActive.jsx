import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listEntries } from '../../services/itemsureCountService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useCountAutosave from '../../hooks/useCountAutosave.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import useItemPackages from '../../hooks/useItemPackages.js';
import useLoosePieces from '../../hooks/useLoosePieces.js';
import { usablePackages } from '../../utils/itemsurePackages.js';
import { COUNT_STATUS_LABELS, ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { SITE } from '../../data/itemsureTerms.js';
import { ErrorNote, Modal } from './ItemsureUi.jsx';
import ItemsureCountRow from './ItemsureCountRow.jsx';
import ItemsureCountSaveBar from './ItemsureCountSaveBar.jsx';
import ItemsureCountAddItems from './ItemsureCountAddItems.jsx';
import ItemsureChipScroller from './ItemsureChipScroller.jsx';
import ItemsureCountCategoryFilter, { countItemInCategory } from './ItemsureCountCategoryFilter.jsx';
import useCountCategories from '../../hooks/useCountCategories.js';
import ItemsureCountSupplierFilter, { countItemFromSupplier } from './ItemsureCountSupplierFilter.jsx';
import useSuppliers from '../../hooks/useSuppliers.js';
import { ALL_SPOTS, countingAreas, groupBySpot, NO_AREA, splitForSpot } from '../../utils/itemsureCountAreas.js';
import ItemsureCountAllSpots from './ItemsureCountAllSpots.jsx';
import { slotsInUse } from '../../utils/itemsureItemStock.js';
import useItemPlaces from '../../hooks/useItemPlaces.js';
import useItemStock from '../../hooks/useItemStock.js';

export default function ItemsureCountActive({ data, userId, onReload }) {
  const { session, items, location, storageAreas } = data;
  const { organization, features, can } = useItemsureWorkspace();
  const packaging = useItemPackages(organization.id);
  const piecesFor = useLoosePieces();
  const navigate = useNavigate();
  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.item_id, i])), [items]);
  const autosave = useCountAutosave({ sessionId: session.id, userId, initialEntries: data.entries, itemsById });
  const { entries, drafts, summary } = autosave;
  const areas = useMemo(() => countingAreas(session, storageAreas, entries), [session, storageAreas, entries]);
  const [areaId, setAreaId] = useState(areas[0]?.id ?? NO_AREA);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const categories = useCountCategories(organization.id);
  const [supplierId, setSupplierId] = useState('');
  const suppliers = useSuppliers(organization.id);
  const places = useItemPlaces(organization.id);
  const { stock } = useItemStock(organization.id, can('inventory.view'));
  const { busy, error, run } = useItemsureAction();

  const countedItems = useMemo(() => {
    const ids = new Set(Object.values(entries).map((e) => e.item_id));
    Object.values(drafts).forEach((d) => {
      if (d.text.trim() !== '') ids.add(d.itemId);
    });
    return ids;
  }, [entries, drafts]);

  const allSpots = areaId === ALL_SPOTS;
  const selectedAreaId = allSpots ? null : areaId || null;
  // Items kept, levelled, or stocked in this spot come first; the rest wait behind a button.
  const inUse = useMemo(
    () => (places.places ? slotsInUse({ places: places.places, balances: stock?.balances || [], targets: stock?.targets || [] }) : null),
    [places.places, stock],
  );
  // Counts saved when the screen loaded, so a row never jumps between lists while typing.
  const countedHere = useMemo(
    () => new Set(Object.values(data.entries || {}).filter((e) => (e.storage_area_id || null) === selectedAreaId).map((e) => e.item_id)),
    [data.entries, selectedAreaId],
  );
  const { here, others } = useMemo(
    () => splitForSpot(items, inUse, session.location_id, selectedAreaId, countedHere),
    [items, inUse, session.location_id, selectedAreaId, countedHere],
  );

  const needle = query.trim().toLowerCase();
  const matches = (i) =>
    countItemInCategory(categories, i, categoryId) &&
    countItemFromSupplier(suppliers, i, supplierId) &&
    (!needle || [i.item_name, i.sku, i.barcode, i.category_name].some((v) => String(v || '').toLowerCase().includes(needle)));
  const visible = here.filter(matches);
  const othersMatching = others.filter(matches);
  const othersShown = showOthers || Boolean(needle) ? othersMatching : [];
  // Spots each item was counted in when the screen loaded, so rows don't jump while typing.
  const countedKeys = useMemo(
    () => new Set(Object.values(data.entries || {}).map((e) => `${e.item_id}|${e.storage_area_id || ''}`)),
    [data.entries],
  );
  const spotGroups = allSpots && inUse ? groupBySpot(items.filter(matches), inUse, session.location_id, areas, countedKeys) : null;

  const refresh = () =>
    run(async () => {
      autosave.replaceEntries(await listEntries(session.id));
      await onReload();
    });

  const goToReview = () =>
    run(async () => {
      await autosave.retryAll();
      await onReload();
      navigate(`${ITEMSURE_PATH}/counts/${session.id}/review`);
    });

  const closeAdd = useCallback(() => setAdding(false), []);
  const itemsAdded = async () => {
    setAdding(false);
    await onReload();
  };

  const areaName = (id) => areas.find((a) => (a.id || null) === (id || null))?.name || 'Loose (no specific spot)';
  const row = (item, rowAreaId = areaId) => (
    <ItemsureCountRow
      key={`${item.item_id}:${rowAreaId}`}
      item={item}
      storageAreaId={rowAreaId || null}
      autosave={autosave}
      otherAreaNames={Object.values(entries)
        .filter((e) => e.item_id === item.item_id && (e.storage_area_id || null) !== (rowAreaId || null))
        .map((e) => areaName(e.storage_area_id))}
      packages={features.packaging && packaging.ready ? usablePackages(packaging.packagesFor(item.item_id)) : []}
      pieces={piecesFor(item.item_id)}
    />
  );

  return (
    <div className="isu-page isu-count-active">
      <div className="isu-page-head">
        <div>
          <p className="isu-eyebrow">{COUNT_STATUS_LABELS[session.status]}</p>
          <h1>{session.name}</h1>
          <p className="isu-muted">
            {location?.name || SITE} · {countedItems.size} of {items.length} items counted
          </p>
        </div>
      </div>

      <ItemsureCountSaveBar summary={summary} onRetry={autosave.retryAll} />
      <ErrorNote message={error} />

      {areas.length > 1 ? (
        <ItemsureChipScroller
          label="Spot being counted"
          options={[{ value: ALL_SPOTS, label: 'All spots' }, ...areas.map((a) => ({ value: a.id || NO_AREA, label: a.name }))]}
          selected={areaId}
          onSelect={(id) => {
            setAreaId(id);
            setShowOthers(false);
          }}
        />
      ) : (
        <p className="isu-muted isu-small">Counting: {areas[0]?.name}</p>
      )}

      <ItemsureCountCategoryFilter categories={categories} items={items} selected={categoryId} onSelect={setCategoryId} />

      <ItemsureCountSupplierFilter suppliers={suppliers} items={items} selected={supplierId} onSelect={setSupplierId} />

      <input
        type="search"
        className="isu-search"
        placeholder="Find an item"
        aria-label="Find an item"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {allSpots ? (
        <ItemsureCountAllSpots groups={spotGroups} row={row} needle={needle} />
      ) : (
        <>
          {others.length ? (
            <p className="isu-muted isu-small isu-center">
              Showing the {visible.length} item{visible.length === 1 ? '' : 's'} kept in {areaName(selectedAreaId)}
              {categoryId || supplierId ? ' that match your filters' : ''}.
            </p>
          ) : null}
          <ul className="isu-count-rows">{visible.map((item) => row(item))}</ul>
          {othersShown.length ? (
            <>
              <h2 className="isu-count-others-title">Not usually kept here ({othersShown.length})</h2>
              <ul className="isu-count-rows">{othersShown.map((item) => row(item))}</ul>
            </>
          ) : null}
          {!visible.length && !othersShown.length ? (
            <p className="isu-muted">{needle ? 'No items match that search.' : 'No items here match your filters.'}</p>
          ) : null}
          {othersMatching.length && !needle ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm isu-count-others-toggle" onClick={() => setShowOthers((v) => !v)}>
              {showOthers ? 'Hide items not kept here' : `Show ${othersMatching.length} more item${othersMatching.length === 1 ? '' : 's'} not kept here`}
            </button>
          ) : null}
        </>
      )}

      <div className="isu-count-footer">
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={refresh}>
          Refresh
        </button>
        {can('counts.create') ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setAdding(true)}>
            Add new items
          </button>
        ) : null}
        <button type="button" className="isu-btn isu-btn--primary" disabled={busy} onClick={goToReview}>
          Review
        </button>
      </div>

      <Modal open={adding} title="Add items to this count" onClose={closeAdd}>
        <ItemsureCountAddItems organizationId={organization.id} sessionId={session.id} onAdded={itemsAdded} />
      </Modal>
    </div>
  );
}
