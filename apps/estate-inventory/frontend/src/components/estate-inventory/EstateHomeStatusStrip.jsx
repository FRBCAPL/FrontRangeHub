import React, { useMemo } from 'react';
import {
  buildEstateTimeline,
  summarizeTimelineItems
} from '@shared/utils/estateTimeline.js';
import { itemsAddedAfterInventoryCertification } from '@shared/utils/estateCompleteness.js';
import ProbateCountdown from './ProbateCountdown';

/**
 * Compact top strip: probate + progress + inventory snapshot.
 * Prefers shared PR home bootstrap when provided.
 */
const EstateHomeStatusStrip = ({
  settings,
  inventoryCount = 0,
  inventoryLoading = false,
  homeData = null,
  refreshKey = 0,
  onOpenSettings,
  onOpenProgress,
  onSeeCollections = null,
  onCreateCollection = null
}) => {
  void refreshKey;

  const itemStats = useMemo(() => {
    if (homeData?.itemSummary) {
      return {
        itemCount: homeData.itemSummary.itemCount || 0,
        pendingReviewCount: homeData.itemSummary.pendingReviewCount || 0,
        approvedForSaleCount: homeData.itemSummary.approvedForSaleCount || 0,
        distributionCount: homeData.itemSummary.distributionCount || 0,
        pendingAcknowledgementCount:
          homeData.itemSummary.pendingAcknowledgementCount || 0,
        postCertificationItemCount:
          homeData.itemSummary.postCertificationItemCount || 0
      };
    }
    if (homeData?.items) {
      const summary = summarizeTimelineItems(homeData.items);
      const finalized = (homeData.distributions || []).filter(
        (row) => row.status === 'finalized'
      );
      return {
        itemCount: summary.itemCount,
        pendingReviewCount: Math.max(
          homeData.pendingReviewCount || 0,
          summary.pendingReviewCount || 0
        ),
        approvedForSaleCount: summary.approvedForSaleCount,
        distributionCount: finalized.length,
        pendingAcknowledgementCount: finalized.reduce(
          (count, row) =>
            count +
            (row.recipients || []).filter(
              (recipient) => recipient.acknowledgement_status !== 'acknowledged'
            ).length,
          0
        ),
        postCertificationItemCount: itemsAddedAfterInventoryCertification(
          homeData.items,
          settings
        ).length
      };
    }
    return {
      itemCount: 0,
      pendingReviewCount: 0,
      approvedForSaleCount: 0,
      distributionCount: 0,
      pendingAcknowledgementCount: 0,
      postCertificationItemCount: 0
    };
  }, [homeData]);

  const inventoryReady = !inventoryLoading;
  const roomCount = inventoryReady ? Number(inventoryCount) || 0 : null;
  const itemCount = homeData ? Number(itemStats.itemCount) || 0 : inventoryReady ? 0 : null;

  const { steps, completedCount, totalCount } = useMemo(
    () =>
      buildEstateTimeline({
        settings: settings || {},
        roomCount: roomCount || 0,
        itemCount: itemCount || 0,
        pendingReviewCount: itemStats.pendingReviewCount,
        approvedForSaleCount: itemStats.approvedForSaleCount,
        distributionCount: itemStats.distributionCount,
        pendingAcknowledgementCount: itemStats.pendingAcknowledgementCount,
        postCertificationItemCount: itemStats.postCertificationItemCount || 0,
        hasAuctionActivity: false
      }),
    [settings, roomCount, itemCount, itemStats]
  );

  const current =
    steps.find((s) => s.status === 'attention') ||
    steps.find((s) => s.status === 'active') ||
    steps.find((s) => s.status !== 'done' && s.status !== 'optional');
  const progressLabel = settings?.closed_at
    ? 'Closed for records'
    : current?.title || 'Getting started';
  const inventoryValue = !inventoryReady
    ? 'Loading…'
    : roomCount <= 0
      ? 'No rooms yet'
      : itemCount == null
        ? `${roomCount} room${roomCount === 1 ? '' : 's'} · …`
        : itemCount <= 0
          ? `${roomCount} room${roomCount === 1 ? '' : 's'} · no items`
          : `${roomCount} room${roomCount === 1 ? '' : 's'} · ${itemCount} item${
              itemCount === 1 ? '' : 's'
            }`;
  const inventoryAction = !inventoryReady
    ? { label: '…', onClick: null }
    : roomCount <= 0
      ? { label: 'Create room', onClick: onCreateCollection }
      : { label: 'Rooms', onClick: onSeeCollections };

  return (
    <div className="ei-home-status-strip" aria-label="Estate status">
      <ProbateCountdown
        variant="compact"
        lettersIssuedAt={settings?.letters_issued_at}
        caseNumber={settings?.court_case_number || settings?.case_number}
        probateWindowMode={settings?.probate_window_mode}
        probateWindowAmount={settings?.probate_window_amount}
        probateWindowUnit={settings?.probate_window_unit}
        probateWindowEndDate={settings?.probate_window_end_date}
        onOpenSettings={onOpenSettings}
      />
      <section className="ei-status-chip ei-status-chip--progress">
        <div className="ei-status-chip-body">
          <span className="ei-status-chip-label">Progress</span>
          <strong className="ei-status-chip-value">{progressLabel}</strong>
          <span className="ei-status-chip-meta">
            {completedCount} of {totalCount} milestones
          </span>
        </div>
        {onOpenProgress ? (
          <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" onClick={onOpenProgress}>
            Timeline
          </button>
        ) : null}
      </section>
      <section
        className={`ei-status-chip ei-status-chip--inventory${
          inventoryReady && roomCount <= 0 ? ' ei-status-chip--setup' : ''
        }${inventoryReady ? '' : ' is-loading'}`}
      >
        <div className="ei-status-chip-body">
          <span className="ei-status-chip-label">Inventory</span>
          <strong className="ei-status-chip-value">{inventoryValue}</strong>
          <span className="ei-status-chip-meta">
            {!inventoryReady
              ? 'Loading rooms and items…'
              : roomCount <= 0
                ? 'Start with a room, then add photos'
                : 'Open rooms to review or add items'}
          </span>
        </div>
        {inventoryAction.onClick ? (
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small"
            onClick={inventoryAction.onClick}
          >
            {inventoryAction.label}
          </button>
        ) : !inventoryReady ? (
          <span className="ei-inline-spinner ei-status-chip-spinner" aria-hidden="true" />
        ) : null}
      </section>
    </div>
  );
};

export default EstateHomeStatusStrip;
