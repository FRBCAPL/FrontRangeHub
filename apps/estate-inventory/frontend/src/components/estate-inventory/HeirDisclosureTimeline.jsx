import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { buildDisclosureTimeline } from '@shared/utils/estateDisclosureTimeline.js';
import { milestoneExplanation } from '@shared/utils/estateMilestoneExplain.js';

/**
 * Family-facing staged disclosure timeline.
 * Uses server inventory/auction counts when available so distributed items
 * excluded from browse lists still appear in the totals.
 */
const HeirDisclosureTimeline = ({
  settings = {},
  items = [],
  distributions = [],
  caseNumber
}) => {
  const [serverCounts, setServerCounts] = useState(null);
  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await estateInventoryService.getHeirTransparencySummary(caseNumber);
      if (cancelled || !result.success) return;
      setServerCounts({
        inventory: result.data?.inventory || null,
        auctionBreakdown: result.data?.auction_breakdown || null
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [caseNumber]);

  const timeline = useMemo(() => {
    const inventoryCounts = serverCounts?.inventory
      ? {
          total: Number(serverCounts.inventory.total) || 0,
          active: Number(serverCounts.inventory.active) || 0,
          distributed: Number(serverCounts.inventory.distributed) || 0,
          archived: Number(serverCounts.inventory.archived) || 0,
          approvedForSale: Number(serverCounts.auctionBreakdown?.approved_count) || 0,
          auctionPaid: Number(serverCounts.auctionBreakdown?.sold_paid_count) || 0,
          auctionPending: Number(serverCounts.auctionBreakdown?.sold_pending_count) || 0,
          auctionApprovedOnly: 0,
          source: 'server'
        }
      : null;

    const auctionBreakdown = serverCounts?.auctionBreakdown
      ? {
          approvedCount: Number(serverCounts.auctionBreakdown.approved_count) || 0,
          listedCount: Number(serverCounts.auctionBreakdown.listed_count) || 0,
          notListedCount: Number(serverCounts.auctionBreakdown.not_listed_count) || 0,
          soldPendingCount: Number(serverCounts.auctionBreakdown.sold_pending_count) || 0,
          soldPaidCount: Number(serverCounts.auctionBreakdown.sold_paid_count) || 0,
          notListed: (serverCounts.auctionBreakdown.not_listed || []).map((row) => ({
            name: row.name,
            not_listed_reason: row.reason
          })),
          summaryLabel: `${Number(serverCounts.auctionBreakdown.approved_count) || 0} approved · ${
            Number(serverCounts.auctionBreakdown.listed_count) || 0
          } on auction catalog · ${
            Number(serverCounts.auctionBreakdown.not_listed_count) || 0
          } approved but not listed`
        }
      : null;

    return buildDisclosureTimeline({
      settings,
      items,
      distributions,
      inventoryCounts,
      auctionBreakdown
    });
  }, [settings, items, distributions, serverCounts]);

  const activeEvent = timeline.events.find((event) => event.key === activeKey) || null;
  const explanation = activeEvent
    ? milestoneExplanation(activeEvent, {
        inventory: timeline.inventory,
        auctionStatus: timeline.auctionStatus
      })
    : null;

  if (!settings?.case_number && !settings?.id && !(items || []).length) return null;

  return (
    <section className="ei-disclosure-timeline" aria-labelledby="ei-disclosure-title">
      <div className="ei-accounts-section-head">
        <div>
          <h3 id="ei-disclosure-title">Disclosure timeline</h3>
          <p className="ei-settings-hint">
            Staged transparency — tap a milestone for what it means, why it matters, and what is
            next.
          </p>
        </div>
      </div>

      <div className="ei-disclosure-why" role="status">
        <strong>Why final numbers may not appear yet</strong>
        <span>{timeline.whyNotFinal}</span>
      </div>

      <ol className="ei-disclosure-list">
        {timeline.events.map((event) => {
          const doneMark = event.status === 'done' ? ' ✓' : '';
          return (
            <li key={event.key} className={`ei-disclosure-item is-${event.status}`}>
              <div className="ei-disclosure-when">{event.dateLabel || '—'}</div>
              <button
                type="button"
                className={`ei-disclosure-open${activeKey === event.key ? ' is-open' : ''}`}
                onClick={() =>
                  setActiveKey((current) => (current === event.key ? null : event.key))
                }
                aria-expanded={activeKey === event.key}
              >
                <strong>
                  {event.title}
                  {doneMark}
                </strong>
                <span>{event.detail}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {explanation ? (
        <div className="ei-disclosure-explain" role="region" aria-label="Milestone detail">
          <h4>{explanation.title}</h4>
          {explanation.dateLabel ? (
            <p className="ei-settings-hint">Date: {explanation.dateLabel}</p>
          ) : null}
          <ul className="ei-transparency-lines">
            <li>
              <span>What it means</span>
              <strong>{explanation.whatItMeans}</strong>
            </li>
            <li>
              <span>Why it matters</span>
              <strong>{explanation.whyItMatters}</strong>
            </li>
            <li>
              <span>What&apos;s complete</span>
              <strong>{explanation.whatsComplete}</strong>
            </li>
            <li>
              <span>What&apos;s next</span>
              <strong>{explanation.whatsNext}</strong>
            </li>
          </ul>
        </div>
      ) : null}
    </section>
  );
};

export default HeirDisclosureTimeline;
