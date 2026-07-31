import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  buildNoticeOfInventoryPortalSms,
  defaultFamilyPortalUrl
} from '@shared/utils/estateLegalOps.js';
import { resolveProbateWindow } from '@shared/utils/estateInventoryConstants.js';

/**
 * First-time executor guidance — replaces the case-specific Tuesday ops panel.
 * Steps are derived from live estate data so the list shrinks as work is done.
 */
export function buildSteps({
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
  onCopyInvite,
  onOpenClosing,
  onOpenReports,
  needsFamilyUpdate = false,
  familyUpdateStale = false
}) {
  const openLedger = (tab) => {
    if (typeof onOpenLedger === 'function') onOpenLedger(tab);
  };
  const steps = [];
  if (isClosed) {
    steps.push({
      key: 'closed',
      title: 'Estate is closed for records',
      hint: 'View and export only. Reopen in Settings → Records if you need to make changes.',
      actionLabel: 'Open records settings',
      onAction: () => onOpenSettingsSection?.('records'),
      status: 'done'
    });
    return steps;
  }

  if (!settings?.letters_issued_at) {
    steps.push({
      key: 'letters',
      title: 'Set the Letters issued date',
      hint: 'Starts the probate countdown and anchors court deadlines.',
      actionLabel: 'Set Letters date',
      onAction: () => onOpenSettingsSection?.('case'),
      status: 'active'
    });
  }

  const probate = resolveProbateWindow(settings || {});
  if (settings?.letters_issued_at && (probate.needsEndDate || !probate.end)) {
    steps.push({
      key: 'probate_end',
      title: 'Confirm the probate / claims window',
      hint: 'Set how long creditors have to make claims against the estate.',
      actionLabel: 'Edit probate window',
      onAction: () => onOpenSettingsSection?.('case'),
      status: steps.some((s) => s.status === 'active') ? 'upcoming' : 'active'
    });
  }

  if (Number(inventoryCount) <= 0) {
    steps.push({
      key: 'room',
      title: 'Create your first room',
      hint: 'Group items by room or category so the inventory stays organized.',
      actionLabel: 'Create room',
      onAction: onCreateCollection,
      status: steps.some((s) => s.status === 'active') ? 'upcoming' : 'active'
    });
  } else {
    steps.push({
      key: 'add_item',
      title: 'Keep documenting property',
      hint: 'Photo, title, room, and legal status for each item.',
      actionLabel: 'Add item',
      onAction: onAddItem,
      status: steps.some((s) => s.status === 'active') ? 'upcoming' : 'active'
    });
  }

  if (Number(heirCount) <= 0) {
    steps.push({
      key: 'heirs',
      title: 'Add family / heirs',
      hint: 'Create a PIN for each person so they can view inventory and send requests.',
      actionLabel: 'Manage family',
      onAction: () => onOpenSettingsSection?.('heirs'),
      status: steps.some((s) => s.status === 'active') ? 'upcoming' : 'active'
    });
  } else {
    steps.push({
      key: 'invite',
      title: 'Share the family portal',
      hint: 'Copy a notice with the portal link so heirs know how to sign in.',
      actionLabel: 'Copy invite text',
      onAction: onCopyInvite,
      status: 'upcoming'
    });
  }

  steps.push({
    key: 'scenes',
    title: 'Document what you walked into',
    hint: 'Scene photos of rooms, boxes, and bags — separate from heir inventory.',
    actionLabel: 'Scene documentation',
    onAction: onOpenScenes,
    status: 'upcoming'
  });

  steps.push({
    key: 'ledger',
    title: 'Review the estate ledger',
    hint: 'Accounts, expenses, PR loans, distributions, and the estate balance in one place.',
    actionLabel: 'Open ledger',
    onAction: () => openLedger('summary'),
    status: 'upcoming'
  });

  if (settings?.inventory_completed_at && Number(heirCount) > 0) {
    steps.push({
      key: 'distribute',
      title: 'Distribute cash or property',
      hint: 'When the estate is ready, record equal/custom cash shares, property transfers, and receipts.',
      actionLabel: 'Open distributions',
      onAction: () => openLedger('distributions'),
      status: steps.some((s) => s.status === 'active') ? 'upcoming' : 'active'
    });
  }

  if (needsFamilyUpdate || familyUpdateStale) {
    steps.push({
      key: 'family_update',
      title: familyUpdateStale
        ? 'Publish an updated Family Update'
        : 'Publish Family Update #1',
      hint: familyUpdateStale
        ? 'Something material changed since the last published update.'
        : 'Numbered Family Updates give heirs staged process communication.',
      actionLabel: 'Open Reports',
      onAction: onOpenReports,
      status: 'active'
    });
  }

  if (settings?.inventory_completed_at && onOpenClosing) {
    steps.push({
      key: 'close',
      title: 'Close the estate',
      hint: 'Run the closing checklist and generate supporting exports. Review with counsel before filing.',
      actionLabel: 'Open closing checklist',
      onAction: onOpenClosing,
      status: 'upcoming'
    });
  }

  if (onLogLocksmith) {
    steps.push({
      key: 'locksmith',
      title: 'Log locksmith / first entry',
      hint: 'Optional. Records perimeter rekeying under Scene documentation, not heir inventory.',
      actionLabel: 'Start locksmith entry',
      onAction: onLogLocksmith,
      status: 'upcoming'
    });
  }

  // Only show the first few actionable items so the panel stays scannable.
  const priority = steps.filter((s) => s.status === 'active' || s.status === 'upcoming');
  return priority.slice(0, 5);
}

const EstateNextStepsPanel = ({
  settings,
  inventoryCount = 0,
  isClosed = false,
  onOpenSettingsSection,
  onCreateCollection,
  onAddItem,
  onOpenScenes,
  onOpenLedger,
  onLogLocksmith,
  onOpenClosing,
  onOpenReports,
  onMessage,
  refreshKey = 0
}) => {
  const [heirCount, setHeirCount] = useState(0);
  const [busyInvite, setBusyInvite] = useState(false);
  const [needsFamilyUpdate, setNeedsFamilyUpdate] = useState(false);
  const [familyUpdateStale, setFamilyUpdateStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const caseNumber = settings?.case_number;
      if (!caseNumber) {
        setHeirCount(0);
        setNeedsFamilyUpdate(false);
        setFamilyUpdateStale(false);
        return;
      }
      const [heirsResult, updatesResult, distResult] = await Promise.all([
        estateInventoryService.listSiblingAccounts(caseNumber),
        estateInventoryService.listOwnerFamilyUpdates(caseNumber),
        estateInventoryService.listEstateDistributions(caseNumber)
      ]);
      if (cancelled) return;
      if (heirsResult.success) setHeirCount((heirsResult.data || []).length);
      else setHeirCount(0);

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
      setNeedsFamilyUpdate(updates.length === 0 && (dists.length > 0 || Boolean(settings?.inventory_completed_at)));
      setFamilyUpdateStale(updates.length > 0 && latestDistAt > 0 && latestDistAt > latestUpdateAt);
    })();
    return () => {
      cancelled = true;
    };
  }, [settings?.case_number, settings?.updated_at, settings?.inventory_completed_at, refreshKey]);

  const copyInvite = async () => {
    setBusyInvite(true);
    const caseNumber = settings?.case_number || '';
    const text = buildNoticeOfInventoryPortalSms(
      defaultFamilyPortalUrl(caseNumber),
      caseNumber
    );
    try {
      await navigator.clipboard.writeText(text);
      onMessage?.('Invite notice copied — paste into a text or email to family.');
    } catch {
      onMessage?.('Could not copy automatically. Open Family / heirs in Settings to share PINs.');
    }
    setBusyInvite(false);
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

  const doneBasics =
    Boolean(settings?.letters_issued_at) &&
    Number(inventoryCount) > 0 &&
    Number(heirCount) > 0;

  return (
    <section className="ei-next-steps" aria-label="Next steps">
      <div className="ei-next-steps-head">
        <div>
          <h2 className="ei-next-steps-title">Next steps</h2>
          <p className="ei-settings-hint">
            {doneBasics
              ? 'Core setup looks complete. Use these shortcuts as you keep working the estate.'
              : 'Suggested next actions for this estate — they update as you finish each one.'}
          </p>
        </div>
      </div>

      <ul className="ei-next-steps-list">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={`ei-next-steps-item${step.status === 'active' ? ' is-active' : ''}`}
          >
            <span className="ei-next-steps-num" aria-hidden="true">
              {index + 1}
            </span>
            <div className="ei-next-steps-body">
              <strong>{step.title}</strong>
              <span>{step.hint}</span>
            </div>
            {step.onAction ? (
              <button
                type="button"
                className={`ei-btn ei-btn-small${
                  step.status === 'active' ? '' : ' ei-btn-secondary'
                }`}
                onClick={step.onAction}
                disabled={busyInvite && step.key === 'invite'}
              >
                {step.actionLabel}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default EstateNextStepsPanel;
