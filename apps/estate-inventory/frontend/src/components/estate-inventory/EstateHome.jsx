import React, { useRef, useState } from 'react';
import EstateTimeline from './EstateTimeline';
import EstateNextStepsPanel from './EstateNextStepsPanel';
import EstateFinanceDashboard from './EstateFinanceDashboard';
import EstateHowItWorksPanel from './EstateHowItWorksPanel';
import EstateHomeStatusStrip from './EstateHomeStatusStrip';
import EstateNeedsAttentionPanel from './EstateNeedsAttentionPanel';

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
  onOpenWhatIsVault,
  onOpenFaq,
  onFinanceSettingsSaved,
  onFinanceChanged,
  inventoryCount = 0,
  pendingRefreshKey = 0,
  financeRefreshKey = 0,
  requestsRefreshKey = 0,
  messagesRefreshKey = 0
}) => {
  const [localRefresh, setLocalRefresh] = useState(0);
  const [ledgerRequestKey, setLedgerRequestKey] = useState(0);
  const [ledgerRequestTab, setLedgerRequestTab] = useState('summary');
  const [progressOpen, setProgressOpen] = useState(false);
  const progressRef = useRef(null);

  const openLedger = (tab = 'summary') => {
    setLedgerRequestTab(tab);
    setLedgerRequestKey((n) => n + 1);
  };

  const gapsRefreshKey =
    pendingRefreshKey + financeRefreshKey + localRefresh + requestsRefreshKey + messagesRefreshKey;

  const openProgress = () => {
    setProgressOpen(true);
    requestAnimationFrame(() => {
      progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  return (
    <section className="ei-home ei-home--command">
      <EstateHowItWorksPanel
        onOpenWhatIsVault={onOpenWhatIsVault}
        onOpenFaq={onOpenFaq}
        onOpenSettingsSection={onOpenSettingsSection || onOpenSettings}
        onSeeCollections={onSeeCollections}
        onOpenLedger={openLedger}
        onOpenReports={onOpenReports}
        onOpenClosing={onOpenClosing}
      />

      <EstateHomeStatusStrip
        settings={settings}
        inventoryCount={inventoryCount}
        refreshKey={pendingRefreshKey + localRefresh}
        onOpenSettings={onOpenSettings}
        onOpenProgress={openProgress}
      />

      <div className="ei-home-alerts" aria-label="Attention and next steps">
        <EstateNeedsAttentionPanel
          settings={settings}
          inventoryCount={inventoryCount}
          isClosed={isClosed}
          refreshKey={gapsRefreshKey}
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

        <EstateNextStepsPanel
          settings={settings}
          inventoryCount={inventoryCount}
          isClosed={isClosed}
          onOpenSettingsSection={onOpenSettingsSection || onOpenSettings}
          onCreateCollection={onCreateCollection}
          onAddItem={onAddItem}
          onOpenScenes={onOpenScenes}
          onOpenLedger={openLedger}
          onLogLocksmith={onLogLocksmith}
          onOpenClosing={onOpenClosing}
          onOpenReports={onOpenReports}
          onMessage={onMessage}
          refreshKey={gapsRefreshKey}
        />
      </div>

      <div className="ei-home-workbench">
        <section className="ei-home-inventory" aria-label="Inventory workbench">
          <h2 className="ei-home-workbench-title">Inventory</h2>
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
              <span className="ei-action-hint">Browse rooms and items</span>
            </button>
            <button type="button" className="ei-action" onClick={onOpenScenes}>
              <span className="ei-action-label">Scene documentation</span>
              <span className="ei-action-hint">Rooms, boxes, bags</span>
            </button>
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
          </div>
        </section>

        <section className="ei-home-money" aria-label="Money workbench">
          <h2 className="ei-home-workbench-title">Money</h2>
          <p className="ei-home-workbench-sub">
    
          </p>
          <EstateFinanceDashboard
            refreshKey={financeRefreshKey}
            ledgerRequestKey={ledgerRequestKey}
            ledgerRequestTab={ledgerRequestTab}
            settings={settings}
            onSettingsSaved={onFinanceSettingsSaved}
            onChanged={onFinanceChanged}
            isClosed={isClosed}
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
          <EstateTimeline
            settings={settings}
            roomCount={inventoryCount}
            refreshKey={pendingRefreshKey + localRefresh}
            onSettingsSaved={onFinanceSettingsSaved}
          />
        </details>
      </div>
    </section>
  );
};

export default EstateHome;
