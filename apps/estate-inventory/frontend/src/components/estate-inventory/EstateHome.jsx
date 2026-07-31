import React, { useState } from 'react';
import ProbateCountdown from './ProbateCountdown';
import EstateTimeline from './EstateTimeline';
import EstateNextStepsPanel from './EstateNextStepsPanel';
import PendingReviewSummary from './PendingReviewSummary';
import AdminHeirRequestsSummary from './AdminHeirRequestsSummary';
import AdminMessagesSummary from './AdminMessagesSummary';
import EstateFinanceDashboard from './EstateFinanceDashboard';
import EstateRecordsGapsPanel from './EstateRecordsGapsPanel';

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
  inventoryCount = 0,
  pendingRefreshKey = 0,
  financeRefreshKey = 0,
  requestsRefreshKey = 0,
  messagesRefreshKey = 0
}) => {
  const [localRefresh, setLocalRefresh] = useState(0);
  const [ledgerRequestKey, setLedgerRequestKey] = useState(0);
  const [ledgerRequestTab, setLedgerRequestTab] = useState('summary');

  const openLedger = (tab = 'summary') => {
    setLedgerRequestTab(tab);
    setLedgerRequestKey((n) => n + 1);
  };

  const gapsRefreshKey =
    pendingRefreshKey + financeRefreshKey + localRefresh + requestsRefreshKey;

  return (
    <section className="ei-home">
      <ProbateCountdown
        lettersIssuedAt={settings?.letters_issued_at}
        caseNumber={
          settings?.court_case_number || settings?.case_number
        }
        probateWindowMode={settings?.probate_window_mode}
        probateWindowAmount={settings?.probate_window_amount}
        probateWindowUnit={settings?.probate_window_unit}
        probateWindowEndDate={settings?.probate_window_end_date}
        onOpenSettings={onOpenSettings}
      />

      <EstateTimeline
        settings={settings}
        roomCount={inventoryCount}
        refreshKey={pendingRefreshKey + localRefresh}
        onSettingsSaved={onFinanceSettingsSaved}
      />

      <EstateRecordsGapsPanel
        refreshKey={gapsRefreshKey}
        isClosed={isClosed}
        onOpenLedger={openLedger}
        onOpenScenes={onOpenScenes}
        onOpenReports={onOpenReports}
        onOpenPendingReview={onOpenPendingReview}
        onOpenSettingsSection={onOpenSettingsSection || onOpenSettings}
        onSeeCollections={onSeeCollections}
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

      <EstateFinanceDashboard
        refreshKey={financeRefreshKey}
        ledgerRequestKey={ledgerRequestKey}
        ledgerRequestTab={ledgerRequestTab}
        settings={settings}
        onSettingsSaved={onFinanceSettingsSaved}
        onChanged={onFinanceChanged}
        isClosed={isClosed}
      />

      <PendingReviewSummary
        refreshKey={pendingRefreshKey + localRefresh}
        onOpenQueue={() => {
          setLocalRefresh((n) => n + 1);
          onOpenPendingReview?.();
        }}
      />

      <AdminHeirRequestsSummary
        refreshKey={requestsRefreshKey + localRefresh}
        onOpenList={() => {
          setLocalRefresh((n) => n + 1);
          onOpenHeirRequests?.();
        }}
      />

      <AdminMessagesSummary
        refreshKey={messagesRefreshKey + localRefresh}
        onOpenMessages={() => {
          setLocalRefresh((n) => n + 1);
          onOpenMessages?.();
        }}
      />

      <div className="ei-actions">
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
        <button type="button" className="ei-action" onClick={onOpenScenes}>
          <span className="ei-action-label">Scene documentation</span>
          <span className="ei-action-hint">What we walked into — rooms, boxes, bags (admin only)</span>
        </button>
        <button
          type="button"
          className="ei-action"
          onClick={onCreateCollection}
          disabled={isClosed}
          title={isClosed ? 'Estate is closed for records. Reopen it before creating rooms.' : ''}
        >
          <span className="ei-action-label">Create room / collection</span>
          <span className="ei-action-hint">Group by room or category</span>
        </button>
        <button type="button" className="ei-action" onClick={onSeeCollections}>
          <span className="ei-action-label">See collections</span>
          <span className="ei-action-hint">Browse rooms and items</span>
        </button>
      </div>
    </section>
  );
};

export default EstateHome;
