import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeSiblingClaims } from '@shared/utils/estateInventoryConstants.js';
import {
  filterAttentionCompletenessGaps,
  sortAttentionCompletenessGaps
} from '@shared/utils/estatePrWorkflow.js';
import EstateModalShell from './EstateModalShell';
import EstateInlineLoading from './EstateInlineLoading';

const GAP_ACTION = {
  stale_balances: { label: 'Update accounts', tab: 'accounts' },
  expense_receipts: { label: 'Attach receipts', tab: 'expenses' },
  high_value_photos: { label: 'Add photos', kind: 'collections' },
  inventory_photos: { label: 'Browse inventory', kind: 'collections' },
  scene_photos: { label: 'Scene docs', kind: 'scenes' },
  acknowledgements: { label: 'Distributions', tab: 'distributions' },
  interim_distributions: { label: 'Distributions', tab: 'distributions' },
  auction_not_listed: { label: 'Inventory status', tab: 'inventory' },
  family_update: { label: 'Open Reports', kind: 'reports' },
  pending_review: { label: 'Review queue', kind: 'pending' },
  inventory_complete: { label: 'Progress / inventory', kind: 'settings_case' },
  letters: { label: 'Set Letters', kind: 'settings_case' }
};

const MAX_ITEMS = 8;

function buildAttentionItems({
  homeData,
  settings,
  inventoryCount,
  actions
}) {
  if (!homeData) return [];

  const next = [];
  const seen = new Set();
  const push = (row) => {
    if (!row?.key || seen.has(row.key) || next.length >= MAX_ITEMS) return;
    seen.add(row.key);
    next.push(row);
  };

  const pendingCount = Number(homeData.pendingReviewCount) || 0;
  if (pendingCount > 0) {
    push({
      key: 'inbox_pending',
      tone: 'block',
      title: 'Pending PR review',
      detail: `${pendingCount} item${pendingCount === 1 ? '' : 's'} waiting for classification.`,
      actionLabel: `Review queue (${pendingCount})`,
      onAction: () => actions.onOpenPendingReview?.()
    });
  }

  const allItems = homeData.items || [];
  const itemCount = allItems.length;
  const requested = allItems.filter(
    (item) => normalizeSiblingClaims(item.sibling_claims).length > 0
  );
  if (requested.length > 0) {
    push({
      key: 'inbox_heirs',
      tone: 'block',
      title: 'Heir requests',
      detail: `${requested.length} item${requested.length === 1 ? '' : 's'} with requests on file.`,
      actionLabel: `View requests (${requested.length})`,
      onAction: () => actions.onOpenHeirRequests?.()
    });
  }

  const unread = Number(homeData.unreadMessages) || 0;
  if (unread > 0) {
    push({
      key: 'inbox_messages',
      tone: 'block',
      title: 'Unread messages',
      detail: `${unread} unread message${unread === 1 ? '' : 's'} from heirs.`,
      actionLabel: `View messages (${unread})`,
      onAction: () => actions.onOpenMessages?.()
    });
  }

  const heirCount = Number(homeData.heirCount) || 0;
  const dists = (homeData.distributions || []).filter((row) => row.status === 'finalized');
  const rawExceptions = homeData.completeness?.exceptions || [];
  const filtered = filterAttentionCompletenessGaps(rawExceptions, {
    inventoryCount,
    itemCount,
    heirCount,
    hasFinalizedDistributions: dists.length > 0,
    inventoryCompleted: Boolean(settings?.inventory_completed_at),
    lettersIssued: Boolean(settings?.letters_issued_at),
    skipPendingReviewGap: pendingCount > 0
  });
  const exceptions = sortAttentionCompletenessGaps(filtered);

  for (const row of exceptions) {
    const meta = GAP_ACTION[row.key] || {};
    push({
      key: `gap_${row.key}`,
      tone: row.severity === 'block' ? 'block' : 'warn',
      title: row.label,
      detail: row.detail,
      samples: row.samples || [],
      samplesTotal: Number(row.samplesTotal) || (row.samples || []).length,
      actionLabel: meta.label || null,
      onAction: () => {
        if (meta.tab) actions.onOpenLedger?.(meta.tab);
        else if (meta.kind === 'scenes') actions.onOpenScenes?.();
        else if (meta.kind === 'reports') actions.onOpenReports?.();
        else if (meta.kind === 'pending') actions.onOpenPendingReview?.();
        else if (meta.kind === 'settings_case') actions.onOpenSettingsSection?.('case');
        else if (meta.kind === 'collections') actions.onSeeCollections?.();
      }
    });
  }

  return next;
}

/**
 * Home panel: interruptive inbox + phased completeness gaps.
 * Uses shared PR home bootstrap (no nested completeness/finance fetch).
 */
const EstateNeedsAttentionPanel = ({
  settings,
  inventoryCount = 0,
  isClosed = false,
  homeData = null,
  homeLoading = false,
  onOpenPendingReview,
  onOpenHeirRequests,
  onOpenMessages,
  onOpenLedger,
  onOpenScenes,
  onOpenReports,
  onOpenSettingsSection,
  onSeeCollections,
  onCreateCollection,
  onAddItem,
  onLogLocksmith,
  onOpenClosing,
  onMessage
}) => {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState('urgent');
  const [itemIndex, setItemIndex] = useState(0);

  const actionsRef = useRef({});
  actionsRef.current = {
    onOpenPendingReview,
    onOpenHeirRequests,
    onOpenMessages,
    onOpenLedger,
    onOpenScenes,
    onOpenReports,
    onOpenSettingsSection,
    onSeeCollections,
    onCreateCollection,
    onAddItem,
    onLogLocksmith,
    onOpenClosing,
    onMessage
  };

  const items = useMemo(
    () =>
      buildAttentionItems({
        homeData,
        settings,
        inventoryCount,
        actions: actionsRef.current
      }),
    [
      homeData,
      inventoryCount,
      settings?.inventory_completed_at,
      settings?.letters_issued_at,
      settings?.case_number,
      isClosed
    ]
  );

  const loading = Boolean(homeLoading);

  const runAction = (row) => {
    setOpen(false);
    row?.onAction?.();
  };

  const count = items.length;
  const isClear = !loading && count === 0;
  const urgent = items.filter((row) => row.tone === 'block');
  const sooner = items.filter((row) => row.tone !== 'block');
  const pages = [
    urgent.length
      ? {
          id: 'urgent',
          label: 'Urgent',
          rows: urgent,
          primary: true,
          blurb: 'Handle these first — they usually block someone else.'
        }
      : null,
    sooner.length
      ? {
          id: 'followup',
          label: 'Follow up',
          rows: sooner,
          primary: !urgent.length,
          blurb: 'Important, but usually not blocking right this minute.'
        }
      : null
  ].filter(Boolean);
  const activePage = pages.find((p) => p.id === page) || pages[0] || null;
  const hasMultiPages = pages.length > 1;
  const pageRows = activePage?.rows || [];
  const safeItemIndex = Math.min(itemIndex, Math.max(0, pageRows.length - 1));
  const activeItem = pageRows[safeItemIndex] || null;
  const hasMultiItems = pageRows.length > 1;

  useEffect(() => {
    if (!open) return;
    setPage(urgent.length ? 'urgent' : 'followup');
    setItemIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setItemIndex(0);
  }, [page]);

  const selectPage = (id) => {
    setPage(id);
    setItemIndex(0);
  };

  const openModal = () => {
    setPage(urgent.length ? 'urgent' : 'followup');
    setItemIndex(0);
    setOpen(true);
  };

  const renderFocusCard = (row) => {
    if (!row) return null;
    const canAct = !isClosed && row.actionLabel && typeof row.onAction === 'function';
    return (
      <article
        className={`ei-guide-focus ei-guide-card ei-guide-card--attention is-${row.tone} is-primary`}
      >
        <div className="ei-guide-focus-meta">
          <span className={`ei-guide-card-badge is-${row.tone}`}>
            {row.tone === 'block' ? 'Urgent' : 'Follow up'}
          </span>
          {hasMultiItems ? (
            <span className="ei-guide-card-step">
              {safeItemIndex + 1} of {pageRows.length}
            </span>
          ) : null}
        </div>
        <h4 className="ei-guide-card-title">{row.title}</h4>
        {row.detail ? <p className="ei-guide-card-body">{row.detail}</p> : null}
        {row.samples?.length ? (
          <ul className="ei-gap-samples ei-gap-samples--chips">
            {row.samples.map((sample) => (
              <li key={`${row.key}-${sample.id || sample.name}`}>
                <span className="ei-gap-sample-name">{sample.name}</span>
                {sample.id ? (
                  <span className="ei-gap-sample-id" title={sample.id}>
                    {sample.id.length > 10 ? `${sample.id.slice(0, 8)}…` : sample.id}
                  </span>
                ) : null}
              </li>
            ))}
            {row.samplesTotal > row.samples.length ? (
              <li className="ei-gap-samples-more">
                +{row.samplesTotal - row.samples.length} more
              </li>
            ) : null}
          </ul>
        ) : null}
        {canAct ? (
          <button
            type="button"
            className="ei-btn ei-guide-card-action"
            onClick={() => runAction(row)}
          >
            {row.actionLabel}
          </button>
        ) : null}
      </article>
    );
  };

  const opener = isClear || loading ? (
    <section
      className={`ei-needs-attention ei-needs-attention-panel${isClear ? ' is-clear' : ''}`}
      aria-labelledby="ei-needs-attention-title"
    >
      {loading ? (
        <>
          <div className="ei-needs-attention-head">
            <h2 id="ei-needs-attention-title" className="ei-needs-attention-title">
              Needs attention
            </h2>
          </div>
          <EstateInlineLoading label="Checking what needs you…" />
        </>
      ) : (
        <>
          <div className="ei-needs-attention-head">
            <h2 id="ei-needs-attention-title" className="ei-needs-attention-title">
              Needs attention
            </h2>
          </div>
          <p className="ei-needs-attention-launch-status">Nothing urgent right now.</p>
        </>
      )}
    </section>
  ) : (
    <section
      className="ei-needs-attention ei-needs-attention-panel ei-needs-attention-open"
      aria-labelledby="ei-needs-attention-title"
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={`Needs attention — ${count} items. Open list.`}
      onClick={openModal}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openModal();
        }
      }}
    >
      <div className="ei-needs-attention-head">
        <h2 id="ei-needs-attention-title" className="ei-needs-attention-title">
          Needs attention
        </h2>
        <span className="ei-needs-attention-count" aria-hidden="true">
          {count}
        </span>
      </div>
      <ul className="ei-needs-attention-cats" aria-hidden="true">
        {items.map((row) => (
          <li key={row.key} className={`ei-needs-attention-cat is-${row.tone}`}>
            {row.title}
          </li>
        ))}
      </ul>
    </section>
  );

  const modal =
    open && !isClear && activePage ? (
      <EstateModalShell
        title="Needs attention"
        subtitle={
          count === 1
            ? '1 item waiting for you — tap to handle it'
            : `${count} items · one category at a time`
        }
        onClose={() => setOpen(false)}
        className="ei-modal-needs-attention"
        foot={
          <div className="ei-guide-page-foot">
            {hasMultiItems ? (
              <div className="ei-guide-page-nav" role="navigation" aria-label="Items in category">
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary ei-btn-small"
                  disabled={safeItemIndex <= 0}
                  onClick={() => setItemIndex((n) => Math.max(0, n - 1))}
                >
                  Previous
                </button>
                <span className="ei-guide-page-indicator">
                  {safeItemIndex + 1} / {pageRows.length}
                </span>
                <button
                  type="button"
                  className="ei-btn ei-btn-small"
                  disabled={safeItemIndex >= pageRows.length - 1}
                  onClick={() => setItemIndex((n) => Math.min(pageRows.length - 1, n + 1))}
                >
                  Next item
                </button>
              </div>
            ) : null}
            <button type="button" className="ei-btn ei-btn-secondary" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        }
      >
        {hasMultiPages ? (
          <div className="ei-guide-tabs" role="tablist" aria-label="Attention categories">
            {pages.map((p) => {
              const selected = p.id === activePage.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`ei-guide-tab${selected ? ' is-active' : ''}${
                    p.id === 'urgent' ? ' is-urgent' : ''
                  }`}
                  onClick={() => selectPage(p.id)}
                >
                  <span>{p.label}</span>
                  <span className="ei-guide-tab-count">{p.rows.length}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="ei-guide-stack ei-guide-stack--paged" role="tabpanel">
          <section className="ei-guide-group" aria-label={activePage.label}>
            <p className="ei-guide-page-blurb">{activePage.blurb}</p>

            {hasMultiItems ? (
              <div className="ei-guide-dots" aria-hidden="true">
                {pageRows.map((row, i) => (
                  <button
                    key={row.key}
                    type="button"
                    className={`ei-guide-dot${i === safeItemIndex ? ' is-active' : ''}${
                      row.tone === 'block' ? ' is-urgent' : ''
                    }`}
                    aria-label={`Show item ${i + 1}`}
                    onClick={() => setItemIndex(i)}
                  />
                ))}
              </div>
            ) : null}

            {renderFocusCard(activeItem)}
          </section>
        </div>
      </EstateModalShell>
    ) : null;

  if (typeof document !== 'undefined' && document.body && modal) {
    return (
      <>
        {opener}
        {createPortal(
          <div className="estate-inventory ei-modal-portal">{modal}</div>,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      {opener}
      {modal}
    </>
  );
};

export default EstateNeedsAttentionPanel;
