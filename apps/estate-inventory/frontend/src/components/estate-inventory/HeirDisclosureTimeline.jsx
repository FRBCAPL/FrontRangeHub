import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { buildDisclosureTimeline } from '@shared/utils/estateDisclosureTimeline.js';
import { milestoneExplanation } from '@shared/utils/estateMilestoneExplain.js';
import EstateModalShell from './EstateModalShell';

/**
 * Family-facing staged disclosure timeline.
 * Compact launcher → list modal → milestone detail modal.
 */
const HeirDisclosureTimeline = ({
  settings = {},
  items = [],
  distributions = [],
  caseNumber
}) => {
  const [serverCounts, setServerCounts] = useState(null);
  const [open, setOpen] = useState(false);
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

  const events = timeline.events || [];
  const doneCount = events.filter((e) => e.status === 'done').length;
  const activeEvent = events.find((event) => event.key === activeKey) || null;
  const current =
    events.find((e) => e.status === 'active') || events.find((e) => e.status !== 'done');
  const explanation = activeEvent
    ? milestoneExplanation(activeEvent, {
        inventory: timeline.inventory,
        auctionStatus: timeline.auctionStatus
      })
    : null;

  if (!settings?.case_number && !settings?.id && !(items || []).length) return null;

  const openList = () => setOpen(true);
  const closeList = () => {
    setOpen(false);
    setActiveKey(null);
  };
  const closeDetail = () => setActiveKey(null);

  const opener = (
    <section
      className="ei-disclosure-timeline ei-disclosure-timeline-launch"
      aria-labelledby="ei-disclosure-title"
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label="Disclosure timeline — open details"
      onClick={openList}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openList();
        }
      }}
    >
      <div className="ei-disclosure-launch-head">
        <h3 id="ei-disclosure-title">Timeline</h3>
        {events.length ? (
          <span className="ei-disclosure-launch-count" aria-hidden="true">
            {doneCount}/{events.length}
          </span>
        ) : null}
      </div>
      <p className="ei-disclosure-launch-hint">
        {current?.title
          ? `Now: ${current.title}`
          : 'Staged transparency — tap to review milestones'}
      </p>
      <span className="ei-disclosure-launch-cta">Tap to review</span>
    </section>
  );

  const listModal = open ? (
    <EstateModalShell
      title="Disclosure timeline"
      subtitle="Tap a milestone for details."
      onClose={closeList}
      className="ei-modal-disclosure-timeline"
      compact
    >
      <div className="ei-disclosure-why" role="status">
        <strong>Why final numbers may not appear yet</strong>
        <span>{timeline.whyNotFinal}</span>
      </div>

      <ol className="ei-disclosure-list">
        {events.map((event) => {
          const doneMark = event.status === 'done' ? ' ✓' : '';
          return (
            <li key={event.key} className={`ei-disclosure-item is-${event.status}`}>
              <button
                type="button"
                className="ei-disclosure-open"
                onClick={() => setActiveKey(event.key)}
              >
                <span className="ei-disclosure-when">{event.dateLabel || '—'}</span>
                <strong>
                  {event.title}
                  {doneMark}
                </strong>
                <span className="ei-disclosure-item-detail">{event.detail}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </EstateModalShell>
  ) : null;

  const detailModal =
    open && explanation ? (
      <EstateModalShell
        title={explanation.title}
        subtitle={explanation.dateLabel ? `Date: ${explanation.dateLabel}` : undefined}
        onClose={closeDetail}
        className="ei-modal-disclosure-detail"
        compact
        foot={
          <button type="button" className="ei-btn ei-btn-secondary" onClick={closeDetail}>
            Back to timeline
          </button>
        }
      >
        <ul className="ei-transparency-lines ei-disclosure-explain-lines">
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
      </EstateModalShell>
    ) : null;

  const portalContent =
    listModal || detailModal ? (
      <div className="estate-inventory ei-modal-portal">
        {listModal}
        {detailModal}
      </div>
    ) : null;

  if (typeof document !== 'undefined' && document.body && portalContent) {
    return (
      <>
        {opener}
        {createPortal(portalContent, document.body)}
      </>
    );
  }

  return (
    <>
      {opener}
      {portalContent}
    </>
  );
};

export default HeirDisclosureTimeline;
