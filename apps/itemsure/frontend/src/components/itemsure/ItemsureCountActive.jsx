import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listEntries } from '../../services/itemsureCountService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useCountAutosave from '../../hooks/useCountAutosave.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { COUNT_STATUS_LABELS, ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { ErrorNote, Modal } from './ItemsureUi.jsx';
import ItemsureCountRow from './ItemsureCountRow.jsx';
import ItemsureCountSaveBar from './ItemsureCountSaveBar.jsx';
import ItemsureCountAddItems from './ItemsureCountAddItems.jsx';

const NO_AREA = '';

/** Areas offered while counting: the session's own area, or the location's active areas plus "no specific area". */
function countingAreas(session, storageAreas, entries) {
  if (session.scope === 'storage_area') {
    const area = storageAreas.find((a) => a.id === session.storage_area_id);
    return [{ id: session.storage_area_id, name: area?.name || 'Storage area' }];
  }
  const used = new Set(Object.values(entries).map((e) => e.storage_area_id).filter(Boolean));
  const list = storageAreas.filter((a) => a.is_active || used.has(a.id)).map((a) => ({ id: a.id, name: a.name }));
  return [...list, { id: NO_AREA, name: 'No specific area' }];
}

export default function ItemsureCountActive({ data, userId, onReload }) {
  const { session, items, location, storageAreas } = data;
  const { organization, can } = useItemsureWorkspace();
  const navigate = useNavigate();
  const itemsById = useMemo(() => Object.fromEntries(items.map((i) => [i.item_id, i])), [items]);
  const autosave = useCountAutosave({ sessionId: session.id, userId, initialEntries: data.entries, itemsById });
  const { entries, drafts, summary } = autosave;
  const areas = useMemo(() => countingAreas(session, storageAreas, entries), [session, storageAreas, entries]);
  const [areaId, setAreaId] = useState(areas[0]?.id ?? NO_AREA);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const { busy, error, run } = useItemsureAction();

  const countedItems = useMemo(() => {
    const ids = new Set(Object.values(entries).map((e) => e.item_id));
    Object.values(drafts).forEach((d) => {
      if (d.text.trim() !== '') ids.add(d.itemId);
    });
    return ids;
  }, [entries, drafts]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) => [i.item_name, i.sku, i.barcode, i.category_name].some((v) => String(v || '').toLowerCase().includes(needle)));
  }, [items, query]);

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

  const selectedAreaId = areaId || null;
  const areaName = (id) => areas.find((a) => (a.id || null) === (id || null))?.name || 'No specific area';

  return (
    <div className="isu-page isu-count-active">
      <div className="isu-page-head">
        <div>
          <p className="isu-eyebrow">{COUNT_STATUS_LABELS[session.status]}</p>
          <h1>{session.name}</h1>
          <p className="isu-muted">
            {location?.name || 'Location'} · {countedItems.size} of {items.length} items counted
          </p>
        </div>
      </div>

      <ItemsureCountSaveBar summary={summary} onRetry={autosave.retryAll} />
      <ErrorNote message={error} />

      {areas.length > 1 ? (
        <div className="isu-chips" role="group" aria-label="Storage area being counted">
          {areas.map((a) => (
            <button
              key={a.id || 'none'}
              type="button"
              className={`isu-chip isu-chip--choice${(a.id || NO_AREA) === areaId ? ' is-selected' : ''}`}
              aria-pressed={(a.id || NO_AREA) === areaId}
              onClick={() => setAreaId(a.id || NO_AREA)}
            >
              {a.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="isu-muted isu-small">Counting: {areas[0]?.name}</p>
      )}

      <input
        type="search"
        className="isu-search"
        placeholder="Find an item"
        aria-label="Find an item"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="isu-count-rows">
        {visible.map((item) => (
          <ItemsureCountRow
            key={`${item.item_id}:${areaId}`}
            item={item}
            storageAreaId={selectedAreaId}
            autosave={autosave}
            otherAreaNames={Object.values(entries)
              .filter((e) => e.item_id === item.item_id && (e.storage_area_id || null) !== selectedAreaId)
              .map((e) => areaName(e.storage_area_id))}
          />
        ))}
      </ul>
      {visible.length === 0 ? <p className="isu-muted">No items match that search.</p> : null}

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
