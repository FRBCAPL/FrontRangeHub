import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { normalizeSiblingClaims } from '@shared/utils/estateInventoryConstants.js';
import {
  buildNoticeOfInventoryPortalSms,
  defaultFamilyPortalUrl
} from '@shared/utils/estateLegalOps.js';
import { useEstateCase } from './EstateCaseContext';
import { buildSteps } from './EstateNextStepsPanel';

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

const MAX_ITEMS = 5;

/**
 * Single “Needs attention” hero — merges inbox + records gaps + urgent next steps.
 */
const EstateNeedsAttentionPanel = ({
  settings,
  inventoryCount = 0,
  isClosed = false,
  refreshKey = 0,
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
  const { caseNumber } = useEstateCase();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [
        pendingResult,
        itemsResult,
        threadsResult,
        certResult,
        heirsResult,
        updatesResult,
        distResult
      ] = await Promise.all([
        estateInventoryService.listPendingReviewItems(caseNumber),
        estateInventoryService.listAllItemsWithRooms(caseNumber),
        estateInventoryService.listMessageThreads(caseNumber),
        estateInventoryService.getCompletenessCertificate(),
        estateInventoryService.listSiblingAccounts(caseNumber),
        estateInventoryService.listOwnerFamilyUpdates(caseNumber),
        estateInventoryService.listEstateDistributions(caseNumber)
      ]);
      if (cancelled) return;

      const next = [];
      const seen = new Set();

      const push = (row) => {
        if (!row?.key || seen.has(row.key) || next.length >= MAX_ITEMS) return;
        seen.add(row.key);
        next.push(row);
      };

      const pendingCount = pendingResult.success ? (pendingResult.data || []).length : 0;
      if (pendingCount > 0) {
        push({
          key: 'inbox_pending',
          tone: 'block',
          title: 'Pending PR review',
          detail: `${pendingCount} item${pendingCount === 1 ? '' : 's'} waiting for classification.`,
          actionLabel: `Review queue (${pendingCount})`,
          onAction: onOpenPendingReview
        });
      }

      const requested = itemsResult.success
        ? (itemsResult.data || []).filter(
            (item) => normalizeSiblingClaims(item.sibling_claims).length > 0
          )
        : [];
      if (requested.length > 0) {
        push({
          key: 'inbox_heirs',
          tone: 'block',
          title: 'Heir requests',
          detail: `${requested.length} item${requested.length === 1 ? '' : 's'} with requests on file.`,
          actionLabel: `View requests (${requested.length})`,
          onAction: onOpenHeirRequests
        });
      }

      const unread = threadsResult.success
        ? Number(threadsResult.data?.total_unread) || 0
        : 0;
      if (unread > 0) {
        push({
          key: 'inbox_messages',
          tone: 'warn',
          title: 'Unread messages',
          detail: `${unread} unread message${unread === 1 ? '' : 's'} from heirs.`,
          actionLabel: `View messages (${unread})`,
          onAction: onOpenMessages
        });
      }

      const exceptions =
        certResult.success && certResult.data ? certResult.data.exceptions || [] : [];
      for (const row of exceptions) {
        const meta = GAP_ACTION[row.key] || {};
        push({
          key: `gap_${row.key}`,
          tone: row.severity === 'block' ? 'block' : 'warn',
          title: row.label,
          detail: row.detail,
          actionLabel: meta.label || null,
          onAction: () => {
            if (meta.tab) onOpenLedger?.(meta.tab);
            else if (meta.kind === 'scenes') onOpenScenes?.();
            else if (meta.kind === 'reports') onOpenReports?.();
            else if (meta.kind === 'pending') onOpenPendingReview?.();
            else if (meta.kind === 'settings_case') onOpenSettingsSection?.('case');
            else if (meta.kind === 'collections') onSeeCollections?.();
          }
        });
      }

      const updates = updatesResult.success ? updatesResult.data || [] : [];
      const dists = (distResult.success ? distResult.data || [] : []).filter(
        (row) => row.status === 'finalized'
      );
      const latestUpdateAt = updates[0]?.published_at
        ? new Date(updates[0].published_at).getTime()
        : 0;
      const latestDistAt = dists.reduce((max, row) => {
        const t = new Date(row.finalized_at || row.distribution_date || 0).getTime();
        return Number.isFinite(t) && t > max ? t : max;
      }, 0);
      const needsFamilyUpdate =
        updates.length === 0 &&
        (dists.length > 0 || Boolean(settings?.inventory_completed_at));
      const familyUpdateStale =
        updates.length > 0 && latestDistAt > 0 && latestDistAt > latestUpdateAt;
      const heirCount = heirsResult.success ? (heirsResult.data || []).length : 0;

      const copyInvite = async () => {
        try {
          const notice = buildNoticeOfInventoryPortalSms(
            defaultFamilyPortalUrl(settings?.case_number || caseNumber),
            settings?.case_number || caseNumber
          );
          await navigator.clipboard.writeText(notice);
          onMessage?.('Invite notice copied — paste into a text or email to family.');
        } catch {
          onMessage?.('Could not copy automatically. Open Family / heirs in Settings to share PINs.');
        }
      };

      const steps = buildSteps({
        settings,
        inventoryCount,
        heirCount,
        isClosed,
        onOpenSettingsSection,
        onCreateCollection,
        onAddItem,
        onOpenScenes,
        onOpenLedger,
        onLogLocksmith,
        onCopyInvite: copyInvite,
        onOpenClosing,
        onOpenReports,
        needsFamilyUpdate,
        familyUpdateStale
      });

      for (const step of steps.filter((s) => s.status === 'active')) {
        // Skip setup/ongoing work that duplicates gaps or inbox.
        if (step.key === 'add_item' || step.key === 'scenes' || step.key === 'ledger') continue;
        if (step.key === 'family_update' && seen.has('gap_family_update')) continue;
        if (step.key === 'letters' && seen.has('gap_letters')) continue;
        push({
          key: `step_${step.key}`,
          tone: 'warn',
          title: step.title,
          detail: step.hint,
          actionLabel: step.actionLabel,
          onAction: step.onAction
        });
      }

      setItems(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    caseNumber,
    settings,
    inventoryCount,
    isClosed,
    refreshKey,
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
  ]);

  if (loading) {
    return (
      <section className="ei-needs-attention" aria-busy="true">
        <h2 className="ei-needs-attention-title">Needs attention</h2>
        <p className="ei-settings-hint">Checking what needs you…</p>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="ei-needs-attention is-clear" aria-labelledby="ei-needs-attention-title">
        <h2 id="ei-needs-attention-title" className="ei-needs-attention-title">
          Needs attention
        </h2>
        <p className="ei-status">Nothing urgent right now. Use the workbench below to keep going.</p>
      </section>
    );
  }

  return (
    <section className="ei-needs-attention" aria-labelledby="ei-needs-attention-title">
      <div className="ei-needs-attention-head">
        <h2 id="ei-needs-attention-title" className="ei-needs-attention-title">
          Needs attention
        </h2>
        <span className="ei-needs-attention-count">{items.length}</span>
      </div>
      <ul className="ei-needs-attention-list">
        {items.map((row, index) => (
          <li key={row.key} className={`ei-needs-attention-item is-${row.tone}`}>
            <span className="ei-needs-attention-num" aria-hidden="true">
              {index + 1}
            </span>
            <div className="ei-needs-attention-body">
              <strong>{row.title}</strong>
              {row.detail ? <span>{row.detail}</span> : null}
            </div>
            {!isClosed && row.actionLabel && row.onAction ? (
              <button
                type="button"
                className={`ei-btn ei-btn-small${index === 0 ? '' : ' ei-btn-secondary'}`}
                onClick={row.onAction}
              >
                {row.actionLabel}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default EstateNeedsAttentionPanel;
