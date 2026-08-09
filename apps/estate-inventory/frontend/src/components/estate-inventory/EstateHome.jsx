import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EstateTimeline from './EstateTimeline';
import EstateNextStepsPanel from './EstateNextStepsPanel';
import EstateFinanceDashboard from './EstateFinanceDashboard';
import EstateHomeStatusStrip from './EstateHomeStatusStrip';
import EstateNeedsAttentionPanel from './EstateNeedsAttentionPanel';
import EstateBillingBanner from './EstateBillingBanner';
import EstateInlineLoading from './EstateInlineLoading';
import { useEstateCase } from './EstateCaseContext';
import usePrHomeBootstrap from './usePrHomeBootstrap.js';
import {
  isLocksmithMarkedNotNeeded
} from '@shared/utils/estateLocksmithPref.js';
import { estateitCasePath } from '@shared/utils/estateInventoryConstants.js';
import { saleAuctionCopy } from '@shared/utils/estateSaleAuctionCopy.js';

/**
 * PR admin home — command center:
 * status → needs attention | what's next → inventory | money → timeline.
 */
const EstateHome = ({
  onCreateCollection,
  onSeeCollections,
  onAddItem,
  onOpenPendingReview,
  onOpenHeirRequests,
  onOpenMessages,
  onOpenScenes,
  onLogLocksmith,
  settings,
  isClosed = false,
  onOpenSettings,
  onOpenSettingsSection,
  onMessage,
  onOpenClosing,
  onOpenReports,
  onFinanceSettingsSaved,
  onFinanceChanged,
  onBillingStatus,
  billingAccess = null,
  inventoryCount = 0,
  inventoryLoading: _collectionsListLoading = false,
  pendingRefreshKey = 0,
  financeRefreshKey = 0,
  requestsRefreshKey = 0,
  messagesRefreshKey = 0,
  onStartPageTour = null,
  showPageTourLink = false,
  onBootstrapCollections = null
}) => {
  const { caseNumber: routeCase } = useEstateCase();
  const [localRefresh, setLocalRefresh] = useState(0);
  const [ledgerRequestKey, setLedgerRequestKey] = useState(0);
  const [ledgerRequestTab, setLedgerRequestTab] = useState('summary');
  const [progressOpen, setProgressOpen] = useState(false);
  const [locksmithNotNeeded, setLocksmithNotNeeded] = useState(() =>
    isLocksmithMarkedNotNeeded(settings?.case_number || routeCase)
  );
  const progressRef = useRef(null);

  const activeCase = settings?.case_number || routeCase || '';
  const homeRefreshKey =
    pendingRefreshKey + localRefresh + requestsRefreshKey + messagesRefreshKey;
  // financeRefreshKey is intentionally NOT in homeRefreshKey — a full home remount
  // while the ledger is open wiped account/claim rows mid-save.

  const {
    data: homeData,
    loading: homeLoading,
    financeLoading,
    error: homeError
  } = usePrHomeBootstrap({
    caseNumber: activeCase,
    settings,
    refreshKey: homeRefreshKey,
    financeRefreshKey
  });

  const caseReady = Boolean(activeCase);
  // Rooms ready only after home core returns (authoritative roomCount).
  // Do not wait on the separate collections list fetch — that raced and flashed empty.
  const roomsLoading = caseReady && !homeError && (homeLoading || !homeData);
  // Money stays in loading until finance attaches (or reports financeError).
  // Soft finance refresh (financeLoading with existing finance) must NOT blank the dashboard.
  const moneyLoading =
    caseReady &&
    !homeError &&
    (homeLoading ||
      (!homeData && financeLoading) ||
      (Boolean(homeData) && homeData.finance == null && !homeData.financeError && financeLoading));
  // Full shell gate — never paint empty rooms / empty money / “caught up” mid-load.
  const dashboardBooting = caseReady && !homeError && (roomsLoading || moneyLoading);
  const displayRoomCount =
    homeData?.roomCount != null
      ? Number(homeData.roomCount) || 0
      : Number(inventoryCount) || 0;

  useEffect(() => {
    setLocksmithNotNeeded(isLocksmithMarkedNotNeeded(activeCase));
  }, [activeCase, localRefresh, pendingRefreshKey]);

  useEffect(() => {
    if (!onBootstrapCollections || !Array.isArray(homeData?.collections)) return;
    onBootstrapCollections(homeData.collections);
  }, [homeData?.collections, onBootstrapCollections]);

  const openLocksmith = () => {
    // Keep “not needed” status until PR activates it inside the modal.
    onLogLocksmith?.();
  };

  const openLedger = (tab = 'summary') => {
    setLedgerRequestTab(tab);
    setLedgerRequestKey((n) => n + 1);
  };

  const openProgress = () => {
    setProgressOpen(true);
    requestAnimationFrame(() => {
      progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  if (!caseReady) {
    return (
      <section className="ei-home ei-home--command ei-home--booting" aria-busy="true">
        <div className="ei-home-boot">
          <h2 className="ei-home-boot-title">Loading estate dashboard</h2>
          <EstateInlineLoading label="Opening estate…" />
        </div>
      </section>
    );
  }

  if (dashboardBooting) {
    return (
      <section className="ei-home ei-home--command ei-home--booting" aria-busy="true">
        <EstateBillingBanner
          caseNumber={activeCase}
          refreshKey={pendingRefreshKey + localRefresh}
          sharedAccess={billingAccess}
          onMessage={onMessage}
          onStatus={onBillingStatus}
        />
        <div className="ei-home-boot">
          <h2 className="ei-home-boot-title">Loading estate dashboard</h2>
          <p className="ei-home-boot-copy">
           Retrieving estate data... this may take a few seconds.
           <br /> <br />
           <center>Thank you for your patience.</center>
          </p>
          <EstateInlineLoading
            label={
              roomsLoading && moneyLoading
                ? 'Loading rooms and money…'
                : roomsLoading
                  ? 'Loading rooms and items…'
                  : 'Loading money overview…'
            }
          />
        </div>
      </section>
    );
  }

  if (homeError && !homeData) {
    return (
      <section className="ei-home ei-home--command">
        <div className="ei-error" role="alert">
          {homeError}
        </div>
      </section>
    );
  }

  return (
    <section className="ei-home ei-home--command">
      <EstateBillingBanner
        caseNumber={activeCase}
        refreshKey={pendingRefreshKey + localRefresh}
        sharedAccess={billingAccess}
        onMessage={onMessage}
        onStatus={onBillingStatus}
      />

      <div
        id="ei-pr-coach-status"
        className="ei-pr-coach-target ei-pr-coach-status-wrap"
      >
        <EstateHomeStatusStrip
          settings={settings}
          inventoryCount={displayRoomCount}
          inventoryLoading={false}
          homeData={homeData}
          refreshKey={pendingRefreshKey + localRefresh}
          onOpenSettings={onOpenSettings}
          onOpenProgress={openProgress}
          onSeeCollections={onSeeCollections}
          onCreateCollection={onCreateCollection}
        />
        {showPageTourLink && onStartPageTour ? (
          <button type="button" className="ei-pr-tour-link" onClick={onStartPageTour}>
            Show me around
          </button>
        ) : null}
      </div>

      <div className="ei-home-alerts" aria-label="Attention and next steps">
        <div id="ei-pr-coach-attention" className="ei-pr-coach-target">
          <EstateNeedsAttentionPanel
            settings={settings}
            inventoryCount={displayRoomCount}
            isClosed={isClosed}
            homeData={homeData}
            homeLoading={false}
            onOpenPendingReview={() => {
              setLocalRefresh((n) => n + 1);
              onOpenPendingReview?.();
            }}
            onOpenHeirRequests={() => {
              setLocalRefresh((n) => n + 1);
              onOpenHeirRequests?.();
            }}
            onOpenMessages={() => {
              setLocalRefresh((n) => n + 1);
              onOpenMessages?.();
            }}
            onOpenLedger={openLedger}
            onOpenScenes={onOpenScenes}
            onOpenReports={onOpenReports}
            onOpenSettingsSection={onOpenSettingsSection || onOpenSettings}
            onSeeCollections={onSeeCollections}
            onCreateCollection={onCreateCollection}
            onAddItem={onAddItem}
            onLogLocksmith={onLogLocksmith}
            onOpenClosing={onOpenClosing}
            onOpenProgress={openProgress}
            onMessage={onMessage}
          />
        </div>

        <div id="ei-pr-coach-next" className="ei-pr-coach-target">
          <EstateNextStepsPanel
            settings={settings}
            inventoryCount={displayRoomCount}
            inventoryLoading={false}
            isClosed={isClosed}
            homeData={homeData}
            homeLoading={false}
            onOpenSettingsSection={onOpenSettingsSection || onOpenSettings}
            onCreateCollection={onCreateCollection}
            onAddItem={onAddItem}
            onOpenScenes={onOpenScenes}
            onOpenLedger={openLedger}
            onLogLocksmith={onLogLocksmith}
            onOpenClosing={onOpenClosing}
            onOpenReports={onOpenReports}
            onMessage={onMessage}
            refreshKey={homeRefreshKey}
          />
        </div>
      </div>

      <div className="ei-home-workbench">
        <section
          id="ei-pr-coach-inventory"
          className="ei-home-inventory ei-pr-coach-target"
          aria-label="Action center"
        >
          <h2 className="ei-home-workbench-title">Action center</h2>
          <div className="ei-actions ei-actions--workbench">
            <button
              type="button"
              className="ei-action ei-action-primary"
              onClick={onAddItem}
              disabled={isClosed}
              title={isClosed ? 'Estate is closed for records. Reopen it before adding items.' : ''}
              aria-disabled={isClosed ? true : undefined}
            >
              <span className="ei-action-label">Add item</span>
              <span className="ei-action-hint">Photo, title, room, legal status</span>
            </button>
            <button type="button" className="ei-action" onClick={onSeeCollections}>
              <span className="ei-action-label">See collections</span>
              <span className="ei-action-hint">Rooms list — open one to view items</span>
            </button>
            <button
              type="button"
              className="ei-action"
              onClick={onOpenScenes}
              disabled={isClosed}
              title={
                isClosed
                  ? 'Estate is closed for records. Reopen it before adding documentation.'
                  : ''
              }
              aria-disabled={isClosed ? true : undefined}
            >
              <span className="ei-action-label">Scene documentation</span>
              <span className="ei-action-hint">Rooms, boxes, bags</span>
            </button>
            {onLogLocksmith ? (
              <button
                type="button"
                className="ei-action"
                onClick={openLocksmith}
                disabled={isClosed}
                title={
                  isClosed
                    ? 'Estate is closed for records. Reopen it before adding documentation.'
                    : locksmithNotNeeded
                      ? 'Previously marked not needed — open to activate or add a record'
                      : 'Optional perimeter / rekey record — available anytime'
                }
                aria-disabled={isClosed ? true : undefined}
              >
                <span className="ei-action-label">Locksmith / first entry</span>
                <span className="ei-action-hint">
                  {locksmithNotNeeded
                    ? 'Marked not needed — open to activate'
                    : 'Optional — rekey or first access photos'}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="ei-action"
              onClick={onCreateCollection}
              disabled={isClosed}
              title={isClosed ? 'Estate is closed for records. Reopen it before creating rooms.' : ''}
              aria-disabled={isClosed ? true : undefined}
            >
              <span className="ei-action-label">Create room</span>
              <span className="ei-action-hint">Group by room or category</span>
            </button>
            <button
              type="button"
              className="ei-action"
              onClick={() => onOpenSettingsSection?.('contacts')}
            >
              <span className="ei-action-label">Contacts</span>
              <span className="ei-action-hint">Attorney, CPA, banks, utilities…</span>
            </button>
            <Link
              className="ei-action"
              to={estateitCasePath(activeCase || routeCase, 'auction')}
            >
              <span className="ei-action-label">{saleAuctionCopy.viewPublic}</span>
              <span className="ei-action-hint">
                Browse items approved for sale · {saleAuctionCopy.catalogShort.toLowerCase()}
              </span>
            </Link>
          </div>
        </section>

        <section
          id="ei-pr-coach-money"
          className="ei-home-money ei-pr-coach-target"
          aria-label="Estate finances"
        >
          <h2 className="ei-home-workbench-title">Estate Finances</h2>
          <EstateFinanceDashboard
            refreshKey={financeRefreshKey}
            ledgerRequestKey={ledgerRequestKey}
            ledgerRequestTab={ledgerRequestTab}
            settings={settings}
            onSettingsSaved={onFinanceSettingsSaved}
            onChanged={onFinanceChanged}
            isClosed={isClosed}
            sharedSummary={caseReady ? homeData?.finance ?? null : undefined}
            sharedLoading={false}
            sharedError={homeData?.financeError || homeError || ''}
          />
        </section>
      </div>

      <div className="ei-home-secondary">
        <details
          className="ei-home-fold"
          ref={progressRef}
          open={progressOpen}
          onToggle={(ev) => setProgressOpen(ev.currentTarget.open)}
        >
          <summary>Estate progress timeline</summary>
          {progressOpen ? (
            <EstateTimeline
              settings={settings}
              roomCount={displayRoomCount}
              refreshKey={pendingRefreshKey + localRefresh}
              onSettingsSaved={onFinanceSettingsSaved}
              sharedStats={homeData?.itemSummary || null}
            />
          ) : null}
        </details>
      </div>
    </section>
  );
};

export default EstateHome;
