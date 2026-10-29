import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listCatalog, setItemActive } from '../../services/itemsureItemService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import useItemPlaces from '../../hooks/useItemPlaces.js';
import useItemPackages from '../../hooks/useItemPackages.js';
import useItemStock from '../../hooks/useItemStock.js';
import { itemSummary, visibleSlots, whereLabels } from '../../utils/itemsureItemStock.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { usablePackages } from '../../utils/itemsurePackages.js';
import { ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureItemRow from './ItemsureItemRow.jsx';
import ItemsureCategoryForm from './ItemsureCategoryForm.jsx';
import ItemsureCategoryChips from './ItemsureCategoryChips.jsx';
import { categoryTree, inCategory } from '../../utils/itemsureCategories.js';

export default function ItemsureItems() {
  const { organization, features, can } = useItemsureWorkspace();
  const [catalog, setCatalog] = useState(null);
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const category = params.get('category') || '';
  const chooseCategory = (value) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('category', value);
      else next.delete('category');
      return next;
    }, { replace: true });
  const [modal, setModal] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');
  const { busy, error, setError, run } = useItemsureAction();
  const places = useItemPlaces(organization.id);
  const packaging = useItemPackages(organization.id);
  const { stock } = useItemStock(organization.id, can('inventory.view'));
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

  // Old ?edit=<item id> links go to the edit page.
  const editId = params.get('edit');
  useEffect(() => {
    if (editId) navigate(`${ITEMSURE_PATH}/items/${editId}/edit`, { replace: true });
  }, [editId, navigate]);

  const activeCategories = useMemo(() => (catalog?.categories || []).filter((c) => c.is_active), [catalog]);

  /** Items after the archived and location filters; the category buttons count these. */
  const filteredItems = useMemo(() => (catalog?.items || []).filter((item) => {
    if (!showArchived && !item.is_active) return false;
    if (!locationFilter) return true;
    const sources = { ...(stock || {}), places: places.placesFor(item.id) || [], locations: places.locations };
    return visibleSlots(item.id, sources).some((g) => g.location.id === locationFilter);
  }), [catalog, showArchived, locationFilter, places, stock]);

  const needle = query.trim().toLowerCase();
  // With categories set up, the list waits until a category, search, or location is chosen.
  const browsing = !category && !needle && !locationFilter && activeCategories.length > 0;

  const visibleItems = useMemo(() => {
    if (browsing) return [];
    const tree = categoryTree(activeCategories);
    return filteredItems.filter((item) => {
      if (!inCategory(tree, item, category)) return false;
      if (!needle) return true;
      return [item.name, item.sku, item.barcode, item.categoryName].some((v) => String(v || '').toLowerCase().includes(needle));
    });
  }, [browsing, activeCategories, filteredItems, category, needle]);

  const toggleItem = (item) =>
    run(async () => {
      await setItemActive(organization.id, item.id, !item.is_active);
      await refresh();
    });

  const closeModal = useCallback(() => setModal(''), []);
  const categorySaved = async () => {
    closeModal();
    await refresh();
  };
  const sourcesFor = (itemId) => ({ ...(stock || {}), places: places.placesFor(itemId) || [], locations: places.locations });
  const whereFor = (itemId) => whereLabels(visibleSlots(itemId, sourcesFor(itemId)));

  return (
    <div className="isu-page">
      <PageHead
        title="Inventory"
        description="Everything you stock. Tap an item to see how many you have and change it."
        action={canManageItems ? (
          <button type="button" className="isu-btn isu-btn--primary" onClick={() => navigate(`${ITEMSURE_PATH}/items/new`)}>Add item</button>
        ) : null}
      />
      <ErrorNote message={error} />

      {catalog ? (
        <ItemsureCategoryChips
          categories={activeCategories}
          items={filteredItems}
          selected={category}
          onSelect={chooseCategory}
          onAdd={canManageCategories ? (parentId) => {
            setNewCategoryParent(parentId || '');
            setModal('category');
          } : null}
        />
      ) : null}

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
          <select className="isu-item-filter" aria-label="Location" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="">All locations</option>
            {activeLocations.map((l) => <option key={l.id} value={l.id}>At {l.name}</option>)}
          </select>
        ) : null}
        <label className="isu-check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
        </label>
      </div>

      {catalog === null ? <p className="isu-muted">Loading…</p> : null}
      {catalog && browsing ? (
        <p className="isu-muted isu-center">Pick a category above to see its items, or search.</p>
      ) : null}
      {catalog && !browsing && visibleItems.length === 0 ? (
        <div className="isu-card isu-empty">
          <h2>{catalog.items.length ? 'No matching items' : 'No items yet'}</h2>
          <p className="isu-muted">{catalog.items.length ? 'Try a different category, search, or location.' : canManageItems ? 'Add your first item to start the catalog.' : 'Nothing has been added yet.'}</p>
        </div>
      ) : null}

      <ul className="isu-item-list">
        {visibleItems.map((item) => (
          <ItemsureItemRow
            key={item.id}
            item={item}
            summary={stock ? itemSummary(item.id, { ...stock, locations: places.locations }) : null}
            keptAt={stock || places.ready ? whereFor(item.id) : null}
            packages={features.packaging && packaging.ready ? usablePackages(packaging.packagesFor(item.id)) : null}
            canManage={canManageItems}
            busy={busy}
            onEdit={() => navigate(`${ITEMSURE_PATH}/items/${item.id}/edit`)}
            onToggle={() => toggleItem(item)}
          />
        ))}
      </ul>

      <Modal open={modal === 'category'} title={newCategoryParent ? 'Add subcategory' : 'Add category'} onClose={closeModal}>
        {modal === 'category' ? (
          <ItemsureCategoryForm organizationId={organization.id} categories={activeCategories} parentId={newCategoryParent} onSaved={categorySaved} />
        ) : null}
      </Modal>
    </div>
  );
}
