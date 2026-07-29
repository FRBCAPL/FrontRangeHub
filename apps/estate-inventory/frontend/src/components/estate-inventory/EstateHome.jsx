import React, { useState } from 'react';
import ProbateCountdown from './ProbateCountdown';
import ExportToolbar from './ExportToolbar';
import PendingReviewSummary from './PendingReviewSummary';
import AdminHeirRequestsSummary from './AdminHeirRequestsSummary';
import AdminMessagesSummary from './AdminMessagesSummary';
import EstateTuesdayOpsPanel from './EstateTuesdayOpsPanel';
import EstateFinanceDashboard from './EstateFinanceDashboard';

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
  onOpenSettings,
  onMessage,
  onFinanceSettingsSaved,
  onFinanceChanged,
  pendingRefreshKey = 0,
  financeRefreshKey = 0,
  requestsRefreshKey = 0,
  messagesRefreshKey = 0
}) => {
  const [localRefresh, setLocalRefresh] = useState(0);

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

      <EstateFinanceDashboard
        refreshKey={financeRefreshKey}
        settings={settings}
        onSettingsSaved={onFinanceSettingsSaved}
        onChanged={onFinanceChanged}
      />

      <ExportToolbar
        caseNumber={settings?.case_number}
        displayCaseNumber={settings?.court_case_number || settings?.case_number}
        onMessage={onMessage}
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
        <button type="button" className="ei-action ei-action-primary" onClick={onAddItem}>
          <span className="ei-action-label">Add item</span>
          <span className="ei-action-hint">Photo, title, room, legal status</span>
        </button>
        <button type="button" className="ei-action" onClick={onOpenScenes}>
          <span className="ei-action-label">Scene documentation</span>
          <span className="ei-action-hint">What we walked into — rooms, boxes, bags (admin only)</span>
        </button>
        <button type="button" className="ei-action" onClick={onCreateCollection}>
          <span className="ei-action-label">Create room / collection</span>
          <span className="ei-action-hint">Group by room or category</span>
        </button>
        <button type="button" className="ei-action" onClick={onSeeCollections}>
          <span className="ei-action-label">See collections</span>
          <span className="ei-action-hint">Browse rooms and items</span>
        </button>
      </div>

      <EstateTuesdayOpsPanel
        onLogLocksmith={onLogLocksmith}
        displayCaseNumber={settings?.court_case_number || settings?.case_number}
      />
    </section>
  );
};

export default EstateHome;
