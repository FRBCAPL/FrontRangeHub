import React, { useEffect, useRef, useState } from 'react';
import EstateTimeline from './EstateTimeline';
import EstateNextStepsPanel from './EstateNextStepsPanel';
import EstateFinanceDashboard from './EstateFinanceDashboard';
import EstateHomeStatusStrip from './EstateHomeStatusStrip';
import EstateNeedsAttentionPanel from './EstateNeedsAttentionPanel';
import EstateBillingBanner from './EstateBillingBanner';
import usePrHomeBootstrap from './usePrHomeBootstrap.js';
import {
  isLocksmithMarkedNotNeeded
} from '@shared/utils/estateLocksmithPref.js';

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
  pendingRefreshKey = 0,
  financeRefreshKey = 0,
  requestsRefreshKey = 0,
  messagesRefreshKey = 0,
  onStartPageTour = null,
  showPageTourLink = false
}) => {
  const [localRefresh, setLocalRefresh] = useState(0);
  const [ledgerRequestKey, setLedgerRequestKey] = useState(0);
  const [ledgerRequestTab, setLedgerRequestTab] = useState('summary');
  const [progressOpen, setProgressOpen] = useState(false);
  const [locksmithNotNeeded, setLocksmithNotNeeded] = useState(() =>
    isLocksmithMarkedNotNeeded(settings?.case_number)
  );
  const progressRef = useRef(null);

  const homeRefreshKey =
    pendingRefreshKey + financeRefreshKey + localRefresh + requestsRefreshKey + messagesRefreshKey;

  const {
    data: homeData,
    loading: homeLoading,
    financeLoading
  } = usePrHomeBootstrap({
    caseNumber: settings?.case_number,
    settings,
    refreshKey: homeRefreshKey
  });

  useEffect(() => {
    setLocksmithNotNeeded(isLocksmithMarkedNotNeeded(settings?.case_number));
  }, [settings?.case_number, localRefresh, pendingRefreshKey]);

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

  return (
    <section className="ei-home ei-home--command">
      <EstateBillingBanner
        caseNumber={settings?.case_number}
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
          inventoryCount={inventoryCount}
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
            inventoryCount={inventoryCount}
            isClosed={isClosed}
            homeData={homeData}
            homeLoading={homeLoading}
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
            onMessage={onMessage}
          />
        </div>

        <div id="ei-pr-coach-next" className="ei-pr-coach-target">
          <EstateNextStepsPanel
            settings={settings}
            inventoryCount={inventoryCount}
            isClosed={isClosed}
            homeData={homeData}
            homeLoading={homeLoading}
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
            >
              <span className="ei-action-label">Add item</span>
              <span className="ei-action-hint">Photo, title, room, legal status</span>
            </button>
            <button type="button" className="ei-action" onClick={onSeeCollections}>
              <span className="ei-action-label">See collections</span>
              <span className="ei-action-hint">Rooms list — open one to view items</span>
            </button>
            <button type="button" className="ei-action" onClick={onOpenScenes}>
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
              <span className="ei-action-hint">Attorney, CPA, banks, utilities, auction…</span>
            </button>
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
            sharedSummary={
              homeLoading || homeData ? homeData?.finance ?? null : undefined
            }
            sharedLoading={homeLoading || financeLoading}
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
              roomCount={inventoryCount}
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
