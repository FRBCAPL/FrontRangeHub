import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  buildEstateTimeline,
  summarizeTimelineItems
} from '@shared/utils/estateTimeline.js';
import { itemsAddedAfterInventoryCertification } from '@shared/utils/estateCompleteness.js';

/**
 * "Where am I in the process?" checklist for the executor. Read-only and
 * derived from settings + live inventory counts — it never writes anything.
 */
const EstateTimeline = ({
  settings,
  roomCount = 0,
  inventoryCount = 0,
  refreshKey = 0,
  hasAuctionActivity = false,
  onSettingsSaved,
  sharedStats = null
}) => {
  const [itemStats, setItemStats] = useState(() => ({
    itemCount: Number(sharedStats?.itemCount) || 0,
    pendingReviewCount: Number(sharedStats?.pendingReviewCount) || 0,
    approvedForSaleCount: Number(sharedStats?.approvedForSaleCount) || 0,
    distributionCount: Number(sharedStats?.distributionCount) || 0,
    pendingAcknowledgementCount: Number(sharedStats?.pendingAcknowledgementCount) || 0,
    postCertificationItemCount: Number(sharedStats?.postCertificationItemCount) || 0
  }));
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    if (sharedStats) {
      setItemStats({
        itemCount: Number(sharedStats.itemCount) || 0,
        pendingReviewCount: Number(sharedStats.pendingReviewCount) || 0,
        approvedForSaleCount: Number(sharedStats.approvedForSaleCount) || 0,
        distributionCount: Number(sharedStats.distributionCount) || 0,
        pendingAcknowledgementCount:
          Number(sharedStats.pendingAcknowledgementCount) || 0,
        postCertificationItemCount: Number(sharedStats.postCertificationItemCount) || 0
      });
      return undefined;
    }

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
      const rows = itemsResult.success ? itemsResult.data || [] : [];
      const summary = summarizeTimelineItems(rows);
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
        ),
        postCertificationItemCount: itemsAddedAfterInventoryCertification(rows, settings)
          .length
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [settings?.case_number, settings?.updated_at, settings?.inventory_completed_at, refreshKey, sharedStats]);

  const { steps, completedCount, totalCount, estimatedCompletion, remainingClaimsDays } =
    useMemo(
      () =>
        buildEstateTimeline({
          settings: settings || {},
          roomCount: roomCount || inventoryCount || 0,
          itemCount: itemStats.itemCount,
          pendingReviewCount: itemStats.pendingReviewCount,
          approvedForSaleCount: itemStats.approvedForSaleCount,
          distributionCount: itemStats.distributionCount,
          pendingAcknowledgementCount: itemStats.pendingAcknowledgementCount,
          postCertificationItemCount: itemStats.postCertificationItemCount,
          hasAuctionActivity
        }),
      [
        settings,
        roomCount,
        inventoryCount,
        itemStats,
        hasAuctionActivity
      ]
    );

  const inventoryComplete = Boolean(settings?.inventory_completed_at);
  const canMarkComplete =
    itemStats.itemCount > 0 && itemStats.pendingReviewCount === 0;

  const changeInventoryStatus = async () => {
    setStatusError('');
    if (inventoryComplete) {
      const reason = window.prompt(
        'Why are you reopening the inventory?\n\nThis reason is kept in the estate audit history.'
      );
      if (reason == null) return;
      if (String(reason).trim().length < 5) {
        setStatusError('Enter a brief reason for reopening the inventory.');
        return;
      }
      setStatusBusy(true);
      const result = await estateInventoryService.setInventoryCompletion({
        caseNumber: settings?.case_number,
        complete: false,
        reopenReason: reason
      });
      setStatusBusy(false);
      if (!result.success) {
        setStatusError(result.error || 'Could not reopen the inventory.');
        return;
      }
      onSettingsSaved?.(result.data);
      return;
    }

    if (!canMarkComplete) {
      setStatusError(
        itemStats.itemCount <= 0
          ? 'Add at least one inventory item first.'
          : `Review the ${itemStats.pendingReviewCount} pending item(s) first.`
      );
      return;
    }
    const confirmed = window.confirm(
      'Mark the physical inventory complete?\n\nConfirm that the property has been walked and the Personal Representative believes the inventory is complete. You can reopen it later with a written reason.'
    );
    if (!confirmed) return;
    setStatusBusy(true);
    const result = await estateInventoryService.setInventoryCompletion({
      caseNumber: settings?.case_number,
      complete: true
    });
    setStatusBusy(false);
    if (!result.success) {
      setStatusError(result.error || 'Could not mark the inventory complete.');
      return;
    }
    onSettingsSaved?.(result.data);
  };

  return (
    <section className="ei-timeline" aria-label="Estate progress">
      <div className="ei-timeline-head">
        <div>
          <h3>Estate progress</h3>
          {estimatedCompletion ? (
            <p className="ei-timeline-estimate">
              Target window through {estimatedCompletion}
              {remainingClaimsDays != null && remainingClaimsDays > 0
                ? ` · ${remainingClaimsDays} day${remainingClaimsDays === 1 ? '' : 's'} left in claims`
                : ''}
            </p>
          ) : null}
        </div>
        <div className="ei-timeline-head-actions">
          <span className="ei-timeline-progress">
            {completedCount} of {totalCount} milestones
          </span>
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small"
            onClick={changeInventoryStatus}
            disabled={statusBusy}
            title={
              !inventoryComplete && !canMarkComplete
                ? itemStats.itemCount <= 0
                  ? 'Add an inventory item first'
                  : 'Review pending items first'
                : ''
            }
          >
            {statusBusy
              ? 'Saving…'
              : inventoryComplete
                ? 'Reopen inventory'
                : 'Mark inventory complete'}
          </button>
        </div>
      </div>
      {statusError ? <div className="ei-error ei-timeline-error">{statusError}</div> : null}
      <ol className="ei-timeline-list">
        {steps.map((step) => (
          <li key={step.key} className={`ei-timeline-step is-${step.status}`}>
            <div className="ei-timeline-marker" aria-hidden="true">
              <span className="ei-timeline-dot">
                {step.status === 'done' ? '\u2713' : step.status === 'attention' ? '!' : ''}
              </span>
            </div>
            <div className="ei-timeline-body">
              <span className="ei-timeline-title">{step.title}</span>
              {step.note ? <span className="ei-timeline-note">{step.note}</span> : null}
              {step.status === 'active' ? (
                <span className="ei-timeline-badge">You are here</span>
              ) : null}
              {step.status === 'attention' ? (
                <span className="ei-timeline-badge ei-timeline-badge--attention">Needs update</span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default EstateTimeline;
