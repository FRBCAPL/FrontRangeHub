import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useTargetsData from '../../hooks/useTargetsData.js';
import { targetKey } from '../../utils/itemsureTargets.js';
import { findBalance, NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { categoryTree, inCategory } from '../../utils/itemsureCategories.js';
import { slotsInUse } from '../../utils/itemsureItemStock.js';
import { notifyInventoryChanged } from '../../utils/itemsureChanges.js';
import { site, sites } from '../../data/itemsureTerms.js';
import { ErrorNote, LoadFailed, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureLevelsHelp from './ItemsureLevelsHelp.jsx';
import ItemsureTargetFilters from './ItemsureTargetFilters.jsx';
import ItemsureTargetItemCard from './ItemsureTargetItemCard.jsx';
import ItemsureTargetEditor from './ItemsureTargetEditor.jsx';
import ItemsureTargetCopy from './ItemsureTargetCopy.jsx';

const PAGE = 100;

/**
 * Minimum and par per item and place. One card per item lists the spots it uses;
 * tapping a card opens its spots to edit and save together.
 */
export default function ItemsureTargets() {
  const { organization, can } = useItemsureWorkspace();
  const canEdit = can('inventory.targets.manage');
  const { data, error, reload } = useTargetsData(organization.id);
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({
    locationId: params.get('location') || '',
    areaId: params.has('area') ? params.get('area') : 'all',
    categoryId: '',
    search: params.get('search') || '',
    missingOnly: false,
    everySpot: false,
  });
  const [limit, setLimit] = useState(PAGE);
  const [copying, setCopying] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  const locations = useMemo(() => (data?.locations || []).filter((l) => l.is_active), [data]);
  useEffect(() => {
    if (locations.length && !locations.some((l) => l.id === filters.locationId)) {
      setFilters((f) => ({ ...f, locationId: locations[0].id, areaId: 'all' }));
    }
  }, [locations, filters.locationId]);
  useEffect(() => setLimit(PAGE), [filters]);

  const location = locations.find((l) => l.id === filters.locationId) || null;

  /** Every spot at this location for an item, split into the ones it uses and the rest. */
  const spotsFor = useMemo(() => {
    if (!data || !location) return () => ({ used: [], other: [] });
    const spots = [{ id: null, name: NO_AREA_LABEL }, ...location.storageAreas.filter((a) => a.is_active)];
    // Places that can't load mean "show every spot" rather than hiding anything.
    const inUse = data.places ? slotsInUse(data) : null;
    return (item) => {
      const used = [];
      const other = [];
      for (const spot of spots) {
        const key = targetKey(item.id, location.id, spot.id);
        const row = {
          key,
          item,
          areaId: spot.id || '',
          areaName: spot.name,
          saved: data.targetsByKey[key] || null,
          balance: findBalance(data.balances, item.id, location.id, spot.id),
        };
        if (!inUse || inUse.has(`${item.id}|${location.id}|${spot.id || ''}`)) used.push(row);
        else other.push(row);
      }
      return { used, other };
    };
  }, [data, location]);

  const cards = useMemo(() => {
    if (!data || !location) return [];
    const term = filters.search.trim().toLowerCase();
    const tree = categoryTree(data.categories);
    return data.items
      .filter((i) => i.isActive)
      .filter((i) => inCategory(tree, { category_id: i.categoryId }, filters.categoryId))
      .filter((i) => !term || i.name.toLowerCase().includes(term) || (i.sku || '').toLowerCase().includes(term))
      .map((item) => {
        const { used, other } = spotsFor(item);
        return { item, rows: filters.everySpot ? [...used, ...other] : used };
      })
      .filter(({ rows }) => rows.length)
      .filter(({ rows }) => filters.areaId === 'all' || rows.some((r) => r.areaId === filters.areaId))
      .filter(({ rows }) => !filters.missingOnly || rows.some((r) => !r.saved));
  }, [data, location, filters, spotsFor]);

  const editing = editingId && data ? data.items.find((i) => i.id === editingId) : null;
  const editingSpots = editing ? spotsFor(editing) : null;

  const afterSave = async (count, { stayOpen = false } = {}) => {
    await reload();
    if (stayOpen) return;
    setEditingId(null);
    setMessage(count ? `Saved levels for ${editing?.name}.` : '');
  };

  const afterCopy = async () => {
    setCopying(false);
    await reload();
    notifyInventoryChanged();
  };

  const visible = cards.slice(0, limit);
  const action = canEdit && locations.length > 1 ? (
    <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setCopying(true)}>Copy to another {site}</button>
  ) : null;

  return (
    <div className="isu-page">
      <PageHead title="Warning levels" description="Set &quot;Warn me at&quot; and &quot;Fill up to&quot; for each item. Tap an item to change its levels." action={action} />
      <ItemsureLevelsHelp />
      {data ? <ErrorNote message={error} /> : null}
      {!data && error ? <LoadFailed message={error} onRetry={reload} /> : null}
      {!data && !error ? <p className="isu-muted">Loading…</p> : null}
      {data && !locations.length ? <div className="isu-card isu-empty"><h2>No {sites}</h2><p className="isu-muted">Add a {site} first.</p></div> : null}

      {data && locations.length ? (
        <>
          <ItemsureTargetFilters filters={filters} setFilters={setFilters} locations={locations} categories={data.categories} />
          {!canEdit ? <p className="isu-notice">You can view levels here. Your role can&apos;t change them.</p> : null}
          {message ? <p className="isu-notice" role="status">{message}</p> : null}

          {cards.length ? (
            <ul className="isu-levels-list">
              {visible.map(({ item, rows }) => (
                <ItemsureTargetItemCard
                  key={item.id}
                  item={item}
                  rows={rows}
                  canEdit={canEdit}
                  onOpen={() => {
                    setMessage('');
                    setEditingId(item.id);
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className="isu-muted isu-center">
              {!data.items.some((i) => i.isActive)
                ? 'Add items to your catalog first.'
                : filters.everySpot
                  ? 'Nothing matches these filters.'
                  : 'No items are kept in this spot yet. Tick "Show every spot" to set levels somewhere new.'}
            </p>
          )}
          {cards.length > limit ? (
            <button type="button" className="isu-btn isu-btn--ghost" onClick={() => setLimit((n) => n + PAGE)}>
              Show more ({cards.length - limit} left)
            </button>
          ) : null}
        </>
      ) : null}

      <Modal open={Boolean(editing)} title={editing ? `${editing.name} \u00b7 ${location?.name || ''}` : ''} onClose={() => setEditingId(null)}>
        {editing ? (
          <ItemsureTargetEditor
            key={editing.id}
            organizationId={organization.id}
            item={editing}
            rows={filters.everySpot ? [...editingSpots.used, ...editingSpots.other] : editingSpots.used}
            otherSpots={filters.everySpot ? [] : editingSpots.other}
            savedByKey={data.targetsByKey}
            canEdit={canEdit}
            onSaved={afterSave}
            onCancel={() => setEditingId(null)}
          />
        ) : null}
      </Modal>

      <Modal open={copying} title={`Copy levels to another ${site}`} onClose={() => setCopying(false)}>
        {data && copying ? <ItemsureTargetCopy locations={locations} defaultFromId={filters.locationId} onDone={afterCopy} /> : null}
      </Modal>
    </div>
  );
}
