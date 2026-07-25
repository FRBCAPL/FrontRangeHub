import React, { useState } from 'react';
import ProbateCountdown from './ProbateCountdown';
import ExportToolbar from './ExportToolbar';
import PendingReviewSummary from './PendingReviewSummary';
import { APP_NAME } from '@shared/utils/estateInventoryConstants.js';

const EstateHome = ({
  onCreateCollection,
  onSeeCollections,
  onAddItem,
  onOpenPendingReview,
  settings,
  onOpenSettings,
  onMessage,
  pendingRefreshKey = 0
}) => {
  const [localRefresh, setLocalRefresh] = useState(0);

  return (
    <section className="ei-home">
      <ProbateCountdown
        lettersIssuedAt={settings?.letters_issued_at}
        caseNumber={settings?.case_number}
        onOpenSettings={onOpenSettings}
      />

      <ExportToolbar caseNumber={settings?.case_number} onMessage={onMessage} />

      <PendingReviewSummary
        refreshKey={pendingRefreshKey + localRefresh}
        onOpenQueue={() => {
          setLocalRefresh((n) => n + 1);
          onOpenPendingReview?.();
        }}
      />

      <header className="ei-header">
        <p className="ei-eyebrow">Personal Representative · Admin</p>
        <h1>{APP_NAME}</h1>
        <p className="ei-lede">
          Full control: photos, legal status, memorandum tags, sibling claims, and public-sale approval.
          Helpers capture only — you approve legal classifications in the review queue.
        </p>
      </header>

      <div className="ei-actions">
        <button type="button" className="ei-action ei-action-primary" onClick={onAddItem}>
          <span className="ei-action-label">Add item</span>
          <span className="ei-action-hint">Photo, title, room, legal status</span>
        </button>
        <button type="button" className="ei-action" onClick={onOpenPendingReview}>
          <span className="ei-action-label">Pending review queue</span>
          <span className="ei-action-hint">Classify helper submissions one at a time</span>
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
    </section>
  );
};

export default EstateHome;
