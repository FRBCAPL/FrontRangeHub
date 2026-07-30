import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  buildEstateTimeline,
  summarizeTimelineItems
} from '@shared/utils/estateTimeline.js';

/**
 * "Where am I in the process?" checklist for the executor. Read-only and
 * derived from settings + live inventory counts — it never writes anything.
 */
const EstateTimeline = ({
  settings,
  roomCount = 0,
  inventoryCount = 0,
  refreshKey = 0,
  hasAuctionActivity = false
}) => {
  const [itemStats, setItemStats] = useState({
    itemCount: 0,
    pendingReviewCount: 0,
    approvedForSaleCount: 0
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const caseNumber = settings?.case_number;
      if (!caseNumber) return;
      const [pendingResult, itemsResult] = await Promise.all([
        estateInventoryService.listPendingReviewItems(caseNumber),
        estateInventoryService.listAllItemsWithRooms(caseNumber)
      ]);
      if (cancelled) return;
      const pendingReviewCount = pendingResult.success
        ? (pendingResult.data || []).length
        : 0;
      const summary = summarizeTimelineItems(
        itemsResult.success ? itemsResult.data || [] : []
      );
      setItemStats({
        itemCount: summary.itemCount,
        pendingReviewCount: Math.max(pendingReviewCount, summary.pendingReviewCount),
        approvedForSaleCount: summary.approvedForSaleCount
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [settings?.case_number, settings?.updated_at, refreshKey]);

  const { steps, completedCount, totalCount, estimatedCompletion, remainingClaimsDays } =
    useMemo(
      () =>
        buildEstateTimeline({
          settings: settings || {},
          roomCount: roomCount || inventoryCount || 0,
          itemCount: itemStats.itemCount,
          pendingReviewCount: itemStats.pendingReviewCount,
          approvedForSaleCount: itemStats.approvedForSaleCount,
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
        <span className="ei-timeline-progress">
          {completedCount} of {totalCount} milestones
        </span>
      </div>
      <ol className="ei-timeline-list">
        {steps.map((step) => (
          <li key={step.key} className={`ei-timeline-step is-${step.status}`}>
            <div className="ei-timeline-marker" aria-hidden="true">
              <span className="ei-timeline-dot">{step.status === 'done' ? '\u2713' : ''}</span>
            </div>
            <div className="ei-timeline-body">
              <span className="ei-timeline-title">{step.title}</span>
              {step.note ? <span className="ei-timeline-note">{step.note}</span> : null}
              {step.status === 'active' ? (
                <span className="ei-timeline-badge">You are here</span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default EstateTimeline;
