import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  estateDisplayName,
  estateitCasePath,
  PR_ROLE_GUIDE
} from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import EstateHome from './EstateHome';
import CollectionsList from './CollectionsList';
import CollectionDetail from './CollectionDetail';
import CreateCollectionModal from './CreateCollectionModal';
import AddItemFlow from './AddItemFlow';
import LocksmithEntryModal from './LocksmithEntryModal';
import EstateSettingsModal from './EstateSettingsModal';
import EstateWhatsNewModal from './EstateWhatsNewModal';
import EstateWhatIsVaultModal from './EstateWhatIsVaultModal';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal';
import EstateFaqModal from './EstateFaqModal';
import EstateReportsModal from './EstateReportsModal';
import EstateClosingWizard from './EstateClosingWizard';
import EstateBillingBanner from './EstateBillingBanner';
import { getEstateBillingStatus } from '@shared/services/estateBillingService.js';
import { isBillingLocked } from '@shared/utils/estateBilling.js';
import EditAssetProfileModal from './EditAssetProfileModal';
import PendingReviewPanel from './PendingReviewPanel';
import AdminHeirRequestsPanel from './AdminHeirRequestsPanel';
import AdminMessagesPanel from './AdminMessagesPanel';
import AdminSceneEvidencePanel from './AdminSceneEvidencePanel';
import './EstateInventoryApp.css';

const VIEW = {
  HOME: 'home',
  COLLECTIONS: 'collections',
  DETAIL: 'detail',
  PENDING: 'pending',
  REQUESTS: 'requests',
  MESSAGES: 'messages',
  SCENES: 'scenes'
};

const EstateInventoryApp = ({ onLock, onLeaveEstate = null, onSignOutApp = null }) => {
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
  const [showLocksmith, setShowLocksmith] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [settings, setSettings] = useState({
    case_number: routeCase || '',
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
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);
  const [showSceneCapture, setShowSceneCapture] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showWhatIsVault, setShowWhatIsVault] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showClosing, setShowClosing] = useState(false);
  const [billingAccess, setBillingAccess] = useState(null);
  const isClosed = Boolean(settings?.closed_at);
  const billingLocked = isBillingLocked(billingAccess);

  const openAddItem = (collection = null, preset = null) => {
    if (billingLocked) {
      setBanner('This estate is paused — renew billing in Settings → Billing to make changes.');
      return;
    }
    if (isClosed) {
      setBanner('This estate is closed for records. Reopen it in Settings → Records & retention before making changes.');
      return;
    }
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
    setSettings((prev) => ({ ...prev, case_number: routeCase || '' }));
    refreshCollections();
    refreshSettings().then(() => estateInventoryService.ensureCaseSettings(routeCase));
    (async () => {
      const billing = await getEstateBillingStatus(routeCase);
      setBillingAccess(billing.success ? billing.data : null);
    })();
  }, [routeCase, refreshCollections, refreshSettings]);

  const handleCreateCollection = async (name) => {
    if (billingLocked) {
      return {
        success: false,
        error: 'This estate is paused — renew billing in Settings → Billing.'
      };
    }
    if (isClosed) {
      return {
        success: false,
        error: 'This estate is closed for records. Reopen it before creating a room.'
      };
    }
    const result = await estateInventoryService.createCollection(name, routeCase);
    if (result.success) {
      setCollections((prev) => [result.data, ...prev]);
      setBanner(`Created “${result.data.name}”.`);
    }
    return result;
  };

  const handleItemSaved = async (result) => {
    if (result?.warning) setBanner(result.warning);
    else setBanner('Item saved.');

    const item = result?.data;
    const collectionId = item?.collection_id;
    if (collectionId) {
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId ? { ...c, itemCount: (c.itemCount || 0) + 1 } : c
        )
      );
    }

    if (item) {
      if (view === VIEW.DETAIL && activeCollection?.id === collectionId) {
        setItems((prev) => {
          if (prev.some((it) => it.id === item.id)) return prev;
          return [item, ...prev];
        });
      }
    }

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
    if (isClosed) {
      const error = 'This estate is closed for records. Reopen it before editing inventory.';
      setBanner(error);
      return { success: false, error };
    }
    const result = await estateInventoryService.updateItem(itemId, patch, routeCase);
    if (!result.success) {
      setBanner(result.error || 'Could not update item.');
      return result;
    }
    setItems((prev) => prev.map((it) => (it.id === itemId ? result.data : it)));
    setEditingItem((prev) => (prev?.id === itemId ? result.data : prev));
    setBanner(
      patch.legalStatus === 'archived'
        ? 'Item archived — record kept for the estate file.'
        : patch.auctionPaid
          ? result.warning
            ? result.warning
            : patch.depositAccountId || patch.accountId
              ? 'Item updated — sale marked paid and proceeds deposited into Estate Funds.'
              : 'Item updated — auction marked paid. Deposit proceeds under Estate Money → Transactions if not linked to a fund account.'
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
    setMessagesRefreshKey((n) => n + 1);
  };
  const goPending = () => setView(VIEW.PENDING);
  const goRequests = () => setView(VIEW.REQUESTS);
  const goMessages = () => setView(VIEW.MESSAGES);
  const goScenes = () => {
    setShowSceneCapture(false);
    setView(VIEW.SCENES);
  };
  const goCollections = () => {
    setView(VIEW.COLLECTIONS);
    refreshCollections();
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
            : view === VIEW.MESSAGES
              ? 'Messages'
              : view === VIEW.SCENES
                ? 'Scene documentation'
                : 'Admin dashboard';

  const caseHome = estateitCasePath(routeCase || '');

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
          : view === VIEW.MESSAGES
            ? [
                { label: 'Home', to: caseHome },
                { label: 'Admin', onClick: goHome },
                { label: 'Messages' }
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
        roleGuide={PR_ROLE_GUIDE}
        crumbs={crumbs}
        onBack={backHandler}
        backLabel={backLabel}
        showSettings
            onOpenSettings={() => {
              setSettingsSection(null);
              setShowSettings(true);
            }}
            onOpenWhatsNew={() => setShowWhatsNew(true)}
            onOpenWhatIsVault={() => setShowWhatIsVault(true)}
            onOpenLegalDisclaimer={() => setShowLegalDisclaimer(true)}
            onOpenFaq={() => setShowFaq(true)}
        onLeaveEstate={onLeaveEstate}
        onSignOutApp={onSignOutApp}
        estateName={estateDisplayName(settings, routeCase)}
        displayCaseNumber={settings?.court_case_number || null}
        extraRight={
          <>
            <Link className="ei-nav-icon-btn" to={caseHome} title="Roles / portals">
              Roles
            </Link>
            {onLock ? (
              <button
                type="button"
                className="ei-nav-icon-btn"
                onClick={onLock}
                title="Require the admin PIN again on this device"
              >
                Lock
              </button>
            ) : null}
            <button
              type="button"
              className="ei-nav-icon-btn"
              onClick={() => setShowReports(true)}
              title="Court pack, PDF, share link, and JSON exports"
            >
              Reports
            </button>
          </>
        }
      />

      {banner ? (
        <p className="ei-status" role="status">
          {banner}
        </p>
      ) : null}

      {isClosed ? (
        <div className="ei-records-closed-banner" role="status">
          <strong>Closed for records — view and export only.</strong>
          <span>
            Inventory, finance, settings, family, helper, and auction changes are blocked. Reopen
            with a written reason in Settings → Records &amp; retention.
          </span>
        </div>
      ) : null}

      {billingLocked ? (
        <div className="ei-billing-locked-banner" role="alert">
          <EstateBillingBanner
            caseNumber={routeCase || settings?.case_number}
            forceShow
            onStatus={setBillingAccess}
            onMessage={setBanner}
          />
        </div>
      ) : null}

      {view === VIEW.HOME ? (
        <EstateHome
          onCreateCollection={() => setShowCreateCollection(true)}
          onSeeCollections={goCollections}
          onAddItem={() => openAddItem()}
          onOpenPendingReview={goPending}
          onOpenHeirRequests={goRequests}
          onOpenMessages={goMessages}
          onOpenScenes={goScenes}
          onLogLocksmith={() => setShowLocksmith(true)}
          settings={settings}
          isClosed={isClosed}
          inventoryCount={collections.length}
          onOpenSettings={() => {
            setSettingsSection(null);
            setShowSettings(true);
          }}
          onOpenSettingsSection={(sectionId) => {
            setSettingsSection(sectionId || null);
            setShowSettings(true);
          }}
          onMessage={setBanner}
          onOpenClosing={() => setShowClosing(true)}
          onOpenReports={() => setShowReports(true)}
          onOpenWhatIsVault={() => setShowWhatIsVault(true)}
          onOpenFaq={() => setShowFaq(true)}
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
          messagesRefreshKey={messagesRefreshKey}
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

      {view === VIEW.MESSAGES ? (
        <AdminMessagesPanel
          refreshKey={messagesRefreshKey}
          onChanged={() => setMessagesRefreshKey((n) => n + 1)}
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
          <h2 className="ei-settings-subhead">Rooms</h2>
          <p className="ei-settings-hint" style={{ marginTop: 0 }}>
            Open a room to view and edit its items.
          </p>
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

      <LocksmithEntryModal
        open={showLocksmith}
        onClose={() => setShowLocksmith(false)}
        caseNumber={routeCase}
        onSaved={(result) => {
          setBanner(
            result?.warning
              ? `Locksmith photo saved. ${result.warning}`
              : 'Locksmith photo saved to Scene documentation (admin only).'
          );
        }}
      />

      <EditAssetProfileModal
        open={Boolean(editingItem)}
        item={editingItem}
        collections={collections}
        onClose={() => setEditingItem(null)}
        onSave={handleUpdateItem}
        onDeleted={handleItemDeleted}
        readOnly={isClosed}
        onPhotoUpdated={(updated) => {
          if (!updated?.id) return;
          setEditingItem(updated);
          setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
          setBanner('Photo updated.');
        }}
      />

      <EstateSettingsModal
        open={showSettings}
        onClose={() => {
          setShowSettings(false);
          setSettingsSection(null);
        }}
        initialSettings={settings}
        initialSection={settingsSection}
        onSaved={(data) => {
          setSettings(data);
          setBanner('Settings saved.');
          setFinanceRefreshKey((n) => n + 1);
        }}
      />

      <EstateWhatsNewModal
        role="admin"
        open={showWhatsNew}
        onOpenChange={setShowWhatsNew}
      />
      <EstateWhatIsVaultModal
        open={showWhatIsVault}
        onClose={() => setShowWhatIsVault(false)}
      />
      <EstateLegalDisclaimerModal
        open={showLegalDisclaimer}
        onClose={() => setShowLegalDisclaimer(false)}
      />
      <EstateFaqModal open={showFaq} onClose={() => setShowFaq(false)} />

      <EstateReportsModal
        open={showReports}
        onClose={() => setShowReports(false)}
        caseNumber={settings?.case_number || routeCase}
        displayCaseNumber={settings?.court_case_number || settings?.case_number}
        onMessage={setBanner}
      />

      <EstateClosingWizard
        open={showClosing}
        caseNumber={settings?.case_number || routeCase}
        onClose={() => setShowClosing(false)}
        onClosed={async (data) => {
          if (data) setSettings(data);
          setShowClosing(false);
          setBanner('Estate closed for records.');
          await refreshSettings();
          setFinanceRefreshKey((n) => n + 1);
        }}
      />
    </div>
  );
};

export default EstateInventoryApp;
