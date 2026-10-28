import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listCatalog, setItemActive } from '../../services/itemsureItemService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import useItemPlaces from '../../hooks/useItemPlaces.js';
import { ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureItemForm from './ItemsureItemForm.jsx';
import ItemsureItemRow from './ItemsureItemRow.jsx';
import ItemsureCategoryForm from './ItemsureCategoryForm.jsx';

export default function ItemsureItems() {
  const { organization, can } = useItemsureWorkspace();
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);
  const { busy, error, setError, run } = useItemsureAction();
  const places = useItemPlaces(organization.id);
  const canManageItems = can('items.manage');
  const canManageCategories = can('categories.manage');
  const activeLocations = places.locations.filter((l) => l.is_active);

  const refresh = useCallback(async () => {
    try {
      setCatalog(await listCatalog(organization.id));
    } catch (e) {
      setCatalog({ items: [], categories: [], units: [] });
      setError(e.message);
    }
  }, [organization.id, setError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (catalog?.items || []).filter((item) => {
      if (!showArchived && !item.is_active) return false;
      if (locationFilter && !(places.placesFor(item.id) || []).some((p) => p.location_id === locationFilter)) return false;
      if (!needle) return true;
      return [item.name, item.sku, item.barcode, item.categoryName].some((v) => String(v || '').toLowerCase().includes(needle));
    });
  }, [catalog, query, showArchived, locationFilter, places]);

  const toggleItem = (item) =>
    run(async () => {
      await setItemActive(organization.id, item.id, !item.is_active);
      await refresh();
    });

  const closeModal = useCallback(() => {
    setModal('');
    setEditing(null);
  }, []);
  const saved = async () => {
    closeModal();
    await Promise.all([refresh(), places.reload()]);
  };
  const formProps = catalog ? {
    organizationId: organization.id,
    categories: catalog.categories,
    units: catalog.units,
    canManageCategories,
    locations: places.locations,
    onSaved: saved,
  } : null;

  return (
    <div className="isu-page">
      <PageHead
        title="Items"
        description="One catalog for the whole organization."
        action={canManageItems ? (
          <button type="button" className="isu-btn isu-btn--primary" onClick={() => setModal('item')}>Add item</button>
        ) : null}
      />
      <ErrorNote message={error} />

      <div className="isu-chips" aria-label="Categories">
        {(catalog?.categories || []).filter((c) => c.is_active).map((c) => (
          <span key={c.id} className="isu-chip">{c.name}</span>
        ))}
        {canManageCategories ? (
          <button type="button" className="isu-chip isu-chip--add" onClick={() => setModal('category')}>+ Category</button>
        ) : null}
      </div>

      <div className="isu-toolbar">
        <input
          type="search"
          className="isu-search"
          placeholder="Search name, SKU, barcode, or category"
          aria-label="Search items"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {places.ready && activeLocations.length > 1 ? (
          <select className="isu-item-filter" aria-label="Kept at location" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="">All locations</option>
            {activeLocations.map((l) => <option key={l.id} value={l.id}>Kept at {l.name}</option>)}
          </select>
        ) : null}
        <label className="isu-check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
        </label>
      </div>

      {catalog === null ? <p className="isu-muted">Loading…</p> : null}
      {catalog && visibleItems.length === 0 ? (
        <div className="isu-card isu-empty">
          <h2>{catalog.items.length ? 'No matching items' : 'No items yet'}</h2>
          <p className="isu-muted">{catalog.items.length ? 'Try a different search or location.' : canManageItems ? 'Add your first item to start the catalog.' : 'Nothing has been added yet.'}</p>
        </div>
      ) : null}

      <ul className="isu-item-list">
        {visibleItems.map((item) => (
          <ItemsureItemRow
            key={item.id}
            item={item}
            keptAt={places.ready ? places.labelsFor(item.id) : null}
            canManage={canManageItems}
            busy={busy}
            onEdit={() => setEditing(item)}
            onToggle={() => toggleItem(item)}
          />
        ))}
      </ul>

      <Modal open={modal === 'item'} title="Add item" onClose={closeModal}>
        {formProps ? <ItemsureItemForm {...formProps} places={places.ready ? [] : null} /> : null}
      </Modal>
      <Modal open={Boolean(editing)} title={editing ? `Edit ${editing.name}` : 'Edit item'} onClose={closeModal}>
        {formProps && editing ? (
          <ItemsureItemForm key={editing.id} {...formProps} item={editing} places={places.placesFor(editing.id)} />
        ) : null}
      </Modal>
      <Modal open={modal === 'category'} title="Add category" onClose={closeModal}>
        <ItemsureCategoryForm organizationId={organization.id} onSaved={saved} />
      </Modal>
    </div>
  );
}
