import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  buildEstateTimeline,
  summarizeTimelineItems
} from '@shared/utils/estateTimeline.js';
import ProbateCountdown from './ProbateCountdown';

/**
 * Compact top strip: probate + progress + inventory snapshot.
 */
const EstateHomeStatusStrip = ({
  settings,
  inventoryCount = 0,
  refreshKey = 0,
  onOpenSettings,
  onOpenProgress,
  onSeeCollections = null,
  onCreateCollection = null
}) => {
  const [itemStats, setItemStats] = useState({
    itemCount: 0,
    pendingReviewCount: 0,
    approvedForSaleCount: 0,
    distributionCount: 0,
    pendingAcknowledgementCount: 0
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const caseNumber = settings?.case_number;
      if (!caseNumber) return;
      const [pendingResult, itemsResult, distributionsResult] = await Promise.all([
        estateInventoryService.listPendingReviewItems(caseNumber),
        estateInventoryService.listAllItemsWithRooms(caseNumber),
        estateInventoryService.listEstateDistributions(caseNumber)
      ]);
      if (cancelled) return;
      const pendingReviewCount = pendingResult.success
        ? (pendingResult.data || []).length
        : 0;
      const summary = summarizeTimelineItems(
        itemsResult.success ? itemsResult.data || [] : []
      );
      const finalized = distributionsResult.success
        ? (distributionsResult.data || []).filter((row) => row.status === 'finalized')
        : [];
      setItemStats({
        itemCount: summary.itemCount,
        pendingReviewCount: Math.max(pendingReviewCount, summary.pendingReviewCount),
        approvedForSaleCount: summary.approvedForSaleCount,
        distributionCount: finalized.length,
        pendingAcknowledgementCount: finalized.reduce(
          (count, row) =>
            count +
            (row.recipients || []).filter(
              (recipient) => recipient.acknowledgement_status !== 'acknowledged'
            ).length,
          0
        )
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [settings?.case_number, settings?.updated_at, refreshKey]);

  const { steps, completedCount, totalCount } = useMemo(
    () =>
      buildEstateTimeline({
        settings: settings || {},
        roomCount: inventoryCount || 0,
        itemCount: itemStats.itemCount,
        pendingReviewCount: itemStats.pendingReviewCount,
        approvedForSaleCount: itemStats.approvedForSaleCount,
        distributionCount: itemStats.distributionCount,
        pendingAcknowledgementCount: itemStats.pendingAcknowledgementCount,
        hasAuctionActivity: false
      }),
    [settings, inventoryCount, itemStats]
  );

  const current = steps.find((s) => s.status === 'active') || steps.find((s) => s.status !== 'done');
  const progressLabel = current?.title || 'Getting started';
  const roomCount = Number(inventoryCount) || 0;
  const itemCount = Number(itemStats.itemCount) || 0;
  const inventoryValue =
    roomCount <= 0
      ? 'No rooms yet'
      : itemCount <= 0
        ? `${roomCount} room${roomCount === 1 ? '' : 's'} · no items`
        : `${roomCount} room${roomCount === 1 ? '' : 's'} · ${itemCount} item${
            itemCount === 1 ? '' : 's'
          }`;
  const inventoryAction =
    roomCount <= 0
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
          roomCount <= 0 ? ' ei-status-chip--setup' : ''
        }`}
      >
        <div className="ei-status-chip-body">
          <span className="ei-status-chip-label">Inventory</span>
          <strong className="ei-status-chip-value">{inventoryValue}</strong>
          <span className="ei-status-chip-meta">
            {roomCount <= 0
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
        ) : null}
      </section>
    </div>
  );
};

export default EstateHomeStatusStrip;
