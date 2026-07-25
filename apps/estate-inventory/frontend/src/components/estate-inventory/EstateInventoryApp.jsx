import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { CASE_NUMBER } from '@shared/utils/estateInventoryConstants.js';
import EstateNav from './EstateNav';
import EstateHome from './EstateHome';
import CollectionsList from './CollectionsList';
import CollectionDetail from './CollectionDetail';
import CreateCollectionModal from './CreateCollectionModal';
import AddItemFlow from './AddItemFlow';
import EstateSettingsModal from './EstateSettingsModal';
import './EstateInventoryApp.css';

const VIEW = {
  HOME: 'home',
  COLLECTIONS: 'collections',
  DETAIL: 'detail'
};

const EstateInventoryApp = ({ onLock }) => {
  const navigate = useNavigate();
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
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    case_number: CASE_NUMBER,
    letters_issued_at: null
  });
  const [banner, setBanner] = useState('');

  const openAddItem = (collection = null) => {
    setAddItemCollectionId(collection?.id || '');
    setShowAddItem(true);
  };

  const closeAddItem = () => {
    setShowAddItem(false);
    setAddItemCollectionId('');
  };

  const refreshSettings = useCallback(async () => {
    const result = await estateInventoryService.getSettings();
    if (result.success) setSettings(result.data);
  }, []);

  const refreshCollections = useCallback(async () => {
    setCollectionsLoading(true);
    setCollectionsError('');
    const result = await estateInventoryService.listCollections();
    setCollectionsLoading(false);
    if (!result.success) {
      setCollectionsError(result.error || 'Could not load collections.');
      return [];
    }
    setCollections(result.data || []);
    return result.data || [];
  }, []);

  const openCollection = useCallback(async (collection) => {
    setActiveCollection(collection);
    setView(VIEW.DETAIL);
    setItemsLoading(true);
    setItemsError('');
    const result = await estateInventoryService.listItems(collection.id);
    setItemsLoading(false);
    if (!result.success) {
      setItemsError(result.error || 'Could not load items.');
      setItems([]);
      return;
    }
    setItems(result.data || []);
  }, []);

  useEffect(() => {
    refreshCollections();
    refreshSettings().then(() => estateInventoryService.ensureCaseSettings());
  }, [refreshCollections, refreshSettings]);

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
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === itemId ? result.data : it)));
    setBanner('Item updated.');
  };

  const goHome = () => setView(VIEW.HOME);
  const goCollections = () => {
    setView(VIEW.COLLECTIONS);
    refreshCollections();
  };

  const navTitle =
    view === VIEW.DETAIL
      ? activeCollection?.name || 'Room'
      : view === VIEW.COLLECTIONS
        ? 'Collections'
        : 'Admin dashboard';

  const crumbs =
    view === VIEW.HOME
      ? [
          { label: 'Roles', to: '/estate-inventory' },
          { label: 'Admin' }
        ]
      : view === VIEW.COLLECTIONS
        ? [
            { label: 'Roles', to: '/estate-inventory' },
            { label: 'Admin', onClick: goHome },
            { label: 'Collections' }
          ]
        : [
            { label: 'Roles', to: '/estate-inventory' },
            { label: 'Admin', onClick: goHome },
            { label: 'Collections', onClick: goCollections },
            { label: activeCollection?.name || 'Room' }
          ];

  const backHandler =
    view === VIEW.HOME
      ? () => navigate('/estate-inventory')
      : view === VIEW.COLLECTIONS
        ? goHome
        : goCollections;

  const backLabel = view === VIEW.HOME ? 'Roles' : view === VIEW.DETAIL ? 'Collections' : 'Admin';

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
          onLock ? (
            <button type="button" className="ei-nav-icon-btn" onClick={onLock}>
              Lock
            </button>
          ) : null
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
          settings={settings}
          onOpenSettings={() => setShowSettings(true)}
          onMessage={setBanner}
        />
      ) : null}

      {view === VIEW.COLLECTIONS ? (
        <CollectionsList
          collections={collections}
          loading={collectionsLoading}
          error={collectionsError}
          onOpen={openCollection}
          onAddItem={openAddItem}
        />
      ) : null}

      {view === VIEW.DETAIL ? (
        <CollectionDetail
          collection={activeCollection}
          items={items}
          loading={itemsLoading}
          error={itemsError}
          onAddItem={() => openAddItem(activeCollection)}
          onUpdateItem={handleUpdateItem}
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
        onSaved={handleItemSaved}
        onCollectionCreated={handleCollectionCreatedFromItem}
      />

      <EstateSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        initialSettings={settings}
        onSaved={(data) => {
          setSettings(data);
          setBanner('Settings saved.');
        }}
      />
    </div>
  );
};

export default EstateInventoryApp;
