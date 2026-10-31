import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listCatalog } from '../../services/itemsureItemService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import useItemPlaces from '../../hooks/useItemPlaces.js';
import useItemStock from '../../hooks/useItemStock.js';
import { itemSummary, sortByAttention, visibleSlots, whereAmounts } from '../../utils/itemsureItemStock.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site, sites, SITE } from '../../data/itemsureTerms.js';
import { ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureItemRow from './ItemsureItemRow.jsx';
import ItemsureCategoryForm from './ItemsureCategoryForm.jsx';
import ItemsureCategoryChips from './ItemsureCategoryChips.jsx';
import ItemsureItemGroups from './ItemsureItemGroups.jsx';
import { categoryIcon, categoryTree, extraCategoryNames, foundIn } from '../../utils/itemsureCategories.js';
import { cardTone, groupByStatus } from '../../utils/itemsureItemLook.js';
import { detailsLine } from '../../utils/itemsureItemDetails.js';
import useOpenCounts from '../../hooks/useOpenCounts.js';
import useSuppliers from '../../hooks/useSuppliers.js';
import ItemsureQuickCount from './ItemsureQuickCount.jsx';
import ItemsureUndoBar from './ItemsureUndoBar.jsx';

export default function ItemsureItems() {
  const { organization, can, features } = useItemsureWorkspace();
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
  const [editingCategory, setEditingCategory] = useState(null);
  const { error, setError } = useItemsureAction();
  const places = useItemPlaces(organization.id);
  const { stock } = useItemStock(organization.id, can('inventory.view'));
  const canManageItems = can('items.manage');
  const canManageCategories = can('categories.manage');
  const activeLocations = places.locations.filter((l) => l.is_active);
  const openCounts = useOpenCounts(organization.id, can('counts.edit'));
  const suppliers = useSuppliers(organization.id);
  const [countItem, setCountItem] = useState(null);
  const [counted, setCounted] = useState(null);
  const closeCounted = useCallback(() => setCounted(null), []);

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

  const tree = useMemo(() => categoryTree(activeCategories), [activeCategories]);
  const showDetails = Boolean(features.details && catalog?.detailsAvailable);
  const visibleItems = useMemo(() => {
    if (browsing) {
      // Before a category is picked, only what needs attention.
      if (!stock) return [];
      const summary = (item) => itemSummary(item.id, { ...stock, locations: places.locations });
      const attention = filteredItems.filter((item) => ['danger', 'warn'].includes(cardTone(summary(item))));
      return sortByAttention(attention, summary);
    }
    const matches = filteredItems.filter((item) => {
      if (!foundIn(tree, item, category)) return false;
      if (!needle) return true;
      const details = showDetails ? [item.brand, item.variant] : [];
      return [item.name, item.sku, item.barcode, item.categoryName, suppliers.supplierFor(item.id)?.name, ...details, ...extraCategoryNames(tree, item)]
        .some((v) => String(v || '').toLowerCase().includes(needle));
    });
    if (!stock) return matches;
    return sortByAttention(matches, (item) => itemSummary(item.id, { ...stock, locations: places.locations }));
  }, [browsing, tree, filteredItems, category, needle, stock, places.locations, suppliers, showDetails]);

  const closeModal = useCallback(() => setModal(''), []);
  const categorySaved = async () => {
    closeModal();
    await refresh();
  };
  const summaryFor = (itemId) => (stock ? itemSummary(itemId, { ...stock, locations: places.locations }) : null);
  const sourcesFor = (itemId) => ({ ...(stock || {}), places: places.placesFor(itemId) || [], locations: places.locations });
  const whereFor = (itemId) => whereAmounts(visibleSlots(itemId, sourcesFor(itemId)));

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
            setEditingCategory(null);
            setNewCategoryParent(parentId || '');
            setModal('category');
          } : null}
          onEdit={canManageCategories ? (cat) => {
            setEditingCategory(cat);
            setModal('category');
          } : null}
        />
      ) : null}

      <div className="isu-toolbar">
        <input
          type="search"
          className="isu-search"
          placeholder={showDetails ? 'Search name, brand, SKU, barcode, category, or supplier' : 'Search name, SKU, barcode, category, or supplier'}
          aria-label="Search items"
          autoFocus={params.get('find') === '1'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {places.ready && activeLocations.length > 1 ? (
          <select className="isu-item-filter" aria-label={SITE} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
            <option value="">All {sites}</option>
            {activeLocations.map((l) => <option key={l.id} value={l.id}>At {l.name}</option>)}
          </select>
        ) : null}
        <label className="isu-check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
        </label>
      </div>

      {catalog === null ? <p className="isu-muted">Loading…</p> : null}
      {catalog && !browsing && visibleItems.length === 0 ? (
        <div className="isu-card isu-empty">
          <h2>{catalog.items.length ? 'No matching items' : 'No items yet'}</h2>
          <p className="isu-muted">{catalog.items.length ? `Try a different category, search, or ${site}.` : canManageItems ? 'Add your first item to start the catalog.' : 'Nothing has been added yet.'}</p>
        </div>
      ) : null}

      <ItemsureItemGroups
        groups={groupByStatus(visibleItems, (item) => cardTone(summaryFor(item.id)))}
        titled={browsing}
        renderItem={(item, compact) => (
          <ItemsureItemRow
            key={item.id}
            item={item}
            compact={compact}
            icon={categoryIcon(tree, item.category_id)}
            summary={summaryFor(item.id)}
            keptAt={stock || places.ready ? whereFor(item.id) : null}
            supplier={suppliers.supplierFor(item.id)}
            alsoIn={extraCategoryNames(tree, item)}
            showAlsoIn={!tree.byId.has(category)}
            showSupplier={Boolean(needle) && String(suppliers.supplierFor(item.id)?.name || '').toLowerCase().includes(needle)}
            details={showDetails ? detailsLine(item) : ''}
            onCount={item.is_active && openCounts.sessions.length ? () => setCountItem(item) : null}
            counted={item.is_active && openCounts.sessions.length > 0 && !openCounts.waitingFor(item.id).length}
          />
        )}
      />
      {catalog && browsing ? (
        <p className="isu-muted isu-center">
          {stock && !visibleItems.length ? 'Nothing needs attention right now. ' : ''}
          {visibleItems.length ? 'Pick a category above to see everything, or search.' : 'Pick a category above to see its items, or search.'}
        </p>
      ) : null}

      <Modal
        open={Boolean(countItem)}
        title={countItem && !openCounts.waitingFor(countItem.id).length ? 'Edit count' : 'Add to count'}
        onClose={() => setCountItem(null)}
      >
        {countItem ? (
          <ItemsureQuickCount
            organizationId={organization.id}
            item={countItem}
            sessions={openCounts.sessions}
            startSessionId={openCounts.waitingFor(countItem.id)[0]?.id || openCounts.sessions[0]?.id}
            keptAt={visibleSlots(countItem.id, sourcesFor(countItem.id))}
            precision={catalog?.units.find((u) => u.id === countItem.base_unit_id)?.precision_scale ?? 0}
            canAddItems={can('counts.create')}
            onCancel={() => setCountItem(null)}
            onSaved={(done) => {
              openCounts.markCounted(done.sessionId, countItem.id, done.areaIds);
              setCountItem(null);
              setCounted({
                message: done.message,
                undo: async () => {
                  await done.undo();
                  await openCounts.reload();
                },
              });
            }}
          />
        ) : null}
      </Modal>
      <ItemsureUndoBar done={counted} onClose={closeCounted} />

      <Modal
        open={modal === 'category'}
        title={editingCategory ? `Edit ${editingCategory.name}` : newCategoryParent ? 'Add subcategory' : 'Add category'}
        onClose={closeModal}
      >
        {modal === 'category' ? (
          <ItemsureCategoryForm
            key={editingCategory?.id || 'new'}
            organizationId={organization.id}
            categories={activeCategories}
            parentId={newCategoryParent}
            category={editingCategory}
            iconsAvailable={Boolean(catalog?.iconsAvailable)}
            onSaved={categorySaved}
          />
        ) : null}
      </Modal>
    </div>
  );
}
