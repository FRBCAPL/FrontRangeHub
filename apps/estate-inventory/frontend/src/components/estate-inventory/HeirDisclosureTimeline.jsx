import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { buildDisclosureTimeline } from '@shared/utils/estateDisclosureTimeline.js';

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

  if (!settings?.case_number && !settings?.id && !(items || []).length) return null;

  return (
    <section className="ei-disclosure-timeline" aria-labelledby="ei-disclosure-title">
      <div className="ei-accounts-section-head">
        <div>
          <h3 id="ei-disclosure-title">Disclosure timeline</h3>
          <p className="ei-settings-hint">
            Staged transparency — what has been disclosed and what still waits on the estate
            process.
          </p>
        </div>
      </div>

      <div className="ei-disclosure-why" role="status">
        <strong>Why final numbers may not appear yet</strong>
        <span>{timeline.whyNotFinal}</span>
      </div>

      <ol className="ei-disclosure-list">
        {timeline.events.map((event) => (
          <li key={event.key} className={`ei-disclosure-item is-${event.status}`}>
            <div className="ei-disclosure-when">{event.dateLabel || '—'}</div>
            <div>
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default HeirDisclosureTimeline;
