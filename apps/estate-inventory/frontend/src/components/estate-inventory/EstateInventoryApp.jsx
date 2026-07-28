import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { CASE_NUMBER, estateitCasePath } from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import EstateHome from './EstateHome';
import CollectionsList from './CollectionsList';
import CollectionDetail from './CollectionDetail';
import CreateCollectionModal from './CreateCollectionModal';
import AddItemFlow from './AddItemFlow';
import EstateSettingsModal from './EstateSettingsModal';
import EditAssetProfileModal from './EditAssetProfileModal';
import PendingReviewPanel from './PendingReviewPanel';
import AdminHeirRequestsPanel from './AdminHeirRequestsPanel';
import AdminSceneEvidencePanel from './AdminSceneEvidencePanel';
import RoomAccordionList from './RoomAccordionList';
import StatusPill from './StatusPill';
import { getPhotoEntries } from '@shared/utils/estatePhotoMeta.js';
import {
  isClaimedMemorandum,
  isDisputed,
  isUnauthorizedRemoval,
  valueTierLabel
} from '@shared/utils/estateInventoryConstants.js';
import './EstateInventoryApp.css';

const VIEW = {
  HOME: 'home',
  COLLECTIONS: 'collections',
  DETAIL: 'detail',
  PENDING: 'pending',
  REQUESTS: 'requests',
  SCENES: 'scenes'
};

const EstateInventoryApp = ({ onLock }) => {
  const navigate = useNavigate();
  const { caseNumber: routeCase } = useEstateCase();
  const [view, setView] = useState(VIEW.HOME);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsError, setCollectionsError] = useState('');
  const [activeCollection, setActiveCollection] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemCollectionId, setAddItemCollectionId] = useState('');
  const [addItemPreset, setAddItemPreset] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [settings, setSettings] = useState({
    case_number: routeCase || CASE_NUMBER,
    letters_issued_at: null,
    probate_window_mode: 'duration',
    probate_window_amount: 90,
    probate_window_unit: 'days',
    probate_window_end_date: null
  });
  const [banner, setBanner] = useState('');
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const [requestsRefreshKey, setRequestsRefreshKey] = useState(0);
  const [showSceneCapture, setShowSceneCapture] = useState(false);

  const [allItems, setAllItems] = useState([]);
  const [allItemsLoading, setAllItemsLoading] = useState(false);

  const openAddItem = (collection = null, preset = null) => {
    setAddItemCollectionId(collection?.id || '');
    setAddItemPreset(preset || null);
    setShowAddItem(true);
  };

  const closeAddItem = () => {
    setShowAddItem(false);
    setAddItemCollectionId('');
    setAddItemPreset(null);
  };

  const refreshSettings = useCallback(async () => {
    estateInventoryService.setActiveEstateCase(routeCase);
    const result = await estateInventoryService.getSettings(routeCase);
    if (result.success) setSettings(result.data);
  }, [routeCase]);

  const refreshCollections = useCallback(async () => {
    estateInventoryService.setActiveEstateCase(routeCase);
    setCollectionsLoading(true);
    setCollectionsError('');
    const result = await estateInventoryService.listCollections(routeCase);
    setCollectionsLoading(false);
    if (!result.success) {
      setCollectionsError(result.error || 'Could not load collections.');
      return [];
    }
    setCollections(result.data || []);
    return result.data || [];
  }, [routeCase]);

  const openCollection = useCallback(async (collection) => {
    setActiveCollection(collection);
    setView(VIEW.DETAIL);
    setItemsLoading(true);
    setItemsError('');
    const result = await estateInventoryService.listItems(collection.id, routeCase);
    setItemsLoading(false);
    if (!result.success) {
      setItemsError(result.error || 'Could not load items.');
      setItems([]);
      return;
    }
    setItems(result.data || []);
  }, [routeCase]);

  useEffect(() => {
    estateInventoryService.setActiveEstateCase(routeCase);
    setCollections([]);
    setActiveCollection(null);
    setItems([]);
    setView(VIEW.HOME);
    setSettings((prev) => ({ ...prev, case_number: routeCase || CASE_NUMBER }));
    refreshCollections();
    refreshSettings().then(() => estateInventoryService.ensureCaseSettings(routeCase));
  }, [routeCase, refreshCollections, refreshSettings]);

  const handleCreateCollection = async (name) => {
    const result = await estateInventoryService.createCollection(name);
    if (result.success) {
      setCollections((prev) => [result.data, ...prev]);
      setBanner(`Created “${result.data.name}”.`);
    }
    return result;
  };

  const handleItemSaved = async (result) => {
    if (result?.warning) setBanner(result.warning);
    else setBanner('Item saved.');
    const list = await refreshCollections();
    if (view === VIEW.DETAIL && activeCollection) {
      const match = list.find((c) => c.id === activeCollection.id) || activeCollection;
      await openCollection(match);
    }
  };

  const handleCollectionCreatedFromItem = (collection) => {
    setCollections((prev) => {
      if (prev.some((c) => c.id === collection.id)) return prev;
      return [collection, ...prev];
    });
  };

  const handleUpdateItem = async (itemId, patch) => {
    const result = await estateInventoryService.updateItem(itemId, patch);
    if (!result.success) {
      setBanner(result.error || 'Could not update item.');
      return result;
    }
    setItems((prev) => prev.map((it) => (it.id === itemId ? result.data : it)));
    setAllItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...result.data, room: it.room || result.data.room } : it
      )
    );
    setEditingItem((prev) => (prev?.id === itemId ? result.data : prev));
    setBanner(
      patch.legalStatus === 'archived'
        ? 'Item archived — record kept for the estate file.'
        : 'Item updated (change logged).'
    );
    setRequestsRefreshKey((n) => n + 1);
    if (patch.collectionId && activeCollection && patch.collectionId !== activeCollection.id) {
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      refreshCollections();
    }
    return result;
  };

  const handleItemDeleted = async (itemId) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    setAllItems((prev) => prev.filter((it) => it.id !== itemId));
    setEditingItem(null);
    setBanner('Item permanently deleted.');
    setPendingRefreshKey((n) => n + 1);
    setFinanceRefreshKey((n) => n + 1);
    await refreshCollections();
  };

  const goHome = () => {
    setView(VIEW.HOME);
    setPendingRefreshKey((n) => n + 1);
    setRequestsRefreshKey((n) => n + 1);
  };
  const goPending = () => setView(VIEW.PENDING);
  const goRequests = () => setView(VIEW.REQUESTS);
  const goScenes = () => {
    setShowSceneCapture(false);
    setView(VIEW.SCENES);
  };
  const goCollections = async () => {
    setView(VIEW.COLLECTIONS);
    refreshCollections();
    setAllItemsLoading(true);
    const catalog = await estateInventoryService.listAllItemsWithRooms();
    setAllItemsLoading(false);
    if (catalog.success) setAllItems(catalog.data || []);
  };

  const navTitle =
    view === VIEW.DETAIL
      ? activeCollection?.name || 'Room'
      : view === VIEW.COLLECTIONS
        ? 'Collections'
        : view === VIEW.PENDING
          ? 'Pending review'
          : view === VIEW.REQUESTS
            ? 'Heir requests'
            : view === VIEW.SCENES
              ? 'Scene documentation'
              : 'Admin dashboard';

  const caseHome = estateitCasePath(routeCase || CASE_NUMBER);

  const crumbs =
    view === VIEW.HOME
      ? [
          { label: 'Home', to: caseHome },
          { label: 'Admin' }
        ]
      : view === VIEW.PENDING
        ? [
            { label: 'Home', to: caseHome },
            { label: 'Admin', onClick: goHome },
            { label: 'Pending review' }
          ]
        : view === VIEW.REQUESTS
          ? [
              { label: 'Home', to: caseHome },
              { label: 'Admin', onClick: goHome },
              { label: 'Heir requests' }
            ]
          : view === VIEW.SCENES
            ? [
                { label: 'Home', to: caseHome },
                { label: 'Admin', onClick: goHome },
                { label: 'Scenes' }
              ]
          : view === VIEW.COLLECTIONS
            ? [
                { label: 'Home', to: caseHome },
                { label: 'Admin', onClick: goHome },
                { label: 'Collections' }
              ]
            : [
                { label: 'Home', to: caseHome },
                { label: 'Admin', onClick: goHome },
                { label: 'Collections', onClick: goCollections },
                { label: activeCollection?.name || 'Room' }
              ];

  const backHandler =
    view === VIEW.HOME
      ? () => navigate(caseHome)
      : view === VIEW.DETAIL
        ? goCollections
        : goHome;

  const backLabel =
    view === VIEW.HOME ? 'Home' : view === VIEW.DETAIL ? 'Collections' : 'Admin';

  return (
    <div className="estate-inventory">
      <EstateNav
        title={navTitle}
        crumbs={crumbs}
        onBack={backHandler}
        backLabel={backLabel}
        showSettings
        onOpenSettings={() => setShowSettings(true)}
        extraRight={
          <>
            <Link className="ei-nav-icon-btn" to={caseHome} title="Roles / portals">
              Roles
            </Link>
            {onLock ? (
              <button type="button" className="ei-nav-icon-btn" onClick={onLock}>
                Lock
              </button>
            ) : null}
          </>
        }
      />

      {banner ? (
        <p className="ei-status" role="status">
          {banner}
        </p>
      ) : null}

      {view === VIEW.HOME ? (
        <EstateHome
          onCreateCollection={() => setShowCreateCollection(true)}
          onSeeCollections={goCollections}
          onAddItem={() => openAddItem()}
          onOpenPendingReview={goPending}
          onOpenHeirRequests={goRequests}
          onOpenScenes={goScenes}
          onLogLocksmith={(preset) => openAddItem(null, preset)}
          settings={settings}
          onOpenSettings={() => setShowSettings(true)}
          onMessage={setBanner}
          onFinanceSettingsSaved={(data) => {
            setSettings(data);
            setFinanceRefreshKey((n) => n + 1);
          }}
          onFinanceChanged={() => {
            setFinanceRefreshKey((n) => n + 1);
            refreshSettings();
          }}
          pendingRefreshKey={pendingRefreshKey}
          financeRefreshKey={financeRefreshKey}
          requestsRefreshKey={requestsRefreshKey}
        />
      ) : null}

      {view === VIEW.PENDING ? (
        <PendingReviewPanel
          onChanged={(kind) => {
            setBanner(
              kind === 'rejected'
                ? 'Item archived for audit trail.'
                : 'Pending item approved.'
            );
            setPendingRefreshKey((n) => n + 1);
          }}
        />
      ) : null}

      {view === VIEW.REQUESTS ? (
        <AdminHeirRequestsPanel
          onEditItem={setEditingItem}
          refreshKey={requestsRefreshKey}
        />
      ) : null}

      {view === VIEW.SCENES ? (
        <AdminSceneEvidencePanel
          showCapture={showSceneCapture}
          onCaptureScene={() => setShowSceneCapture(true)}
          onCloseCapture={() => setShowSceneCapture(false)}
        />
      ) : null}

      {view === VIEW.COLLECTIONS ? (
        <>
          <h2 className="ei-settings-subhead">Browse by room</h2>
          {allItemsLoading ? <p className="ei-status">Loading items…</p> : null}
          <RoomAccordionList
            items={allItems}
            renderItem={(item) => {
              const claimed = isClaimedMemorandum(item.legal_status);
              const disputed = isDisputed(item.legal_status);
              const unauthorized = isUnauthorizedRemoval(item.legal_status);
              const photos = getPhotoEntries(item);
              return (
                <article
                  key={item.id}
                  className={`ei-card${claimed ? ' ei-card-claimed' : ''}${disputed ? ' ei-card-disputed' : ''}${unauthorized ? ' ei-card-unauthorized' : ''}`}
                >
                  {photos[0] ? (
                    <img className="ei-card-photo" src={photos[0].url} alt={item.name} loading="lazy" />
                  ) : (
                    <div className="ei-card-photo-placeholder">No photo</div>
                  )}
                  <div className="ei-card-body">
                    <strong>{item.name}</strong>
                    <p className="ei-card-meta">{valueTierLabel(item.value_tier)}</p>
                    <StatusPill status={item.legal_status} />
                    <button
                      type="button"
                      className="ei-btn ei-btn-small"
                      style={{ marginTop: '0.55rem', width: '100%' }}
                      onClick={() => setEditingItem(item)}
                    >
                      Edit asset profile
                    </button>
                  </div>
                </article>
              );
            }}
          />
          <h2 className="ei-settings-subhead">Rooms</h2>
          <CollectionsList
            collections={collections}
            loading={collectionsLoading}
            error={collectionsError}
            onOpen={openCollection}
            onAddItem={openAddItem}
          />
        </>
      ) : null}

      {view === VIEW.DETAIL ? (
        <CollectionDetail
          collection={activeCollection}
          items={items}
          loading={itemsLoading}
          error={itemsError}
          onAddItem={() => openAddItem(activeCollection)}
          onEditItem={setEditingItem}
        />
      ) : null}

      <CreateCollectionModal
        open={showCreateCollection}
        onClose={() => setShowCreateCollection(false)}
        onCreated={handleCreateCollection}
      />

      <AddItemFlow
        open={showAddItem}
        onClose={closeAddItem}
        collections={collections}
        preferredCollectionId={addItemCollectionId || (view === VIEW.DETAIL ? activeCollection?.id : '')}
        initialPreset={addItemPreset}
        caseNumber={routeCase}
        onSaved={handleItemSaved}
        onCollectionCreated={handleCollectionCreatedFromItem}
      />

      <EditAssetProfileModal
        open={Boolean(editingItem)}
        item={editingItem}
        collections={collections}
        onClose={() => setEditingItem(null)}
        onSave={handleUpdateItem}
        onDeleted={handleItemDeleted}
      />

      <EstateSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        initialSettings={settings}
        onSaved={(data) => {
          setSettings(data);
          setBanner('Settings saved.');
          setFinanceRefreshKey((n) => n + 1);
        }}
      />
    </div>
  );
};

export default EstateInventoryApp;
