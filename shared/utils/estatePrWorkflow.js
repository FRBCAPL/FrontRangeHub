/**
 * Personal Representative workflow helpers.
 * What's next = planned path. Needs attention = interrupts + phased gaps.
 */

import { resolveProbateWindow } from './estateInventoryConstants.js';

/** Completeness gaps that belong to money / closing / export phase. */
const LATE_ATTENTION_GAPS = new Set([
  'stale_balances',
  'expense_receipts',
  'acknowledgements',
  'interim_distributions',
  'auction_not_listed',
  'family_update',
  'inventory_complete'
]);

const ATTENTION_GAP_ORDER = [
  'scene_photos',
  'letters',
  'high_value_photos',
  'inventory_photos',
  'stale_balances',
  'expense_receipts',
  'acknowledgements',
  'interim_distributions',
  'auction_not_listed',
  'family_update',
  'inventory_complete',
  'pending_review'
];

/**
 * Planned What's next checklist for the PR admin home.
 * Order: scene → case dates → inventory → helpers → family → money → later.
 */
export function buildWhatsNextSteps({
  settings,
  inventoryCount = 0,
  itemCount = 0,
  heirCount = 0,
  helperCount = 0,
  sceneCount = null,
  isClosed = false,
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
  familyUpdateStale = false,
  locksmithNotNeeded = false
} = {}) {
  const steps = [];
  if (isClosed) {
    return [
      {
        key: 'closed',
        title: 'Estate is closed for records',
        hint: 'View and export only. Reopen in Settings → Records if you need to make changes.',
        actionLabel: 'Open records settings',
        onAction: () => onOpenSettingsSection?.('records'),
        status: 'done'
      }
    ];
  }

  const rooms = Number(inventoryCount) || 0;
  const items = Number(itemCount) || 0;
  const heirs = Number(heirCount) || 0;
  const helpers = Number(helperCount) || 0;
  const scenesKnown = sceneCount != null;
  const scenes = scenesKnown ? Number(sceneCount) || 0 : null;
  const needsScenes = !scenesKnown || scenes <= 0;
  const inventoryCertified = Boolean(settings?.inventory_completed_at);
  const hasLetters = Boolean(settings?.letters_issued_at);
  const estateStarted = rooms > 0 || items > 0 || (scenes != null && scenes > 0) || hasLetters;

  const markStatus = () =>
    steps.some((s) => s.status === 'active') ? 'upcoming' : 'active';

  const openLedger = (tab) => {
    if (typeof onOpenLedger === 'function') onOpenLedger(tab);
  };

  // 1) Preserve as-found condition first.
  if (needsScenes && onOpenScenes) {
    steps.push({
      key: 'scenes',
      title: 'Document what you walked into',
      hint: 'Take scene photos of rooms, boxes, and bags first — before moving or listing items for heirs.',
      actionLabel: 'Scene documentation',
      onAction: onOpenScenes,
      status: 'active'
    });
  }

  // Optional first-entry — offer until PR marks not needed (not only while scenes are empty).
  // Keep status active early so Not needed is easy to find in Do this now.
  if (onLogLocksmith && !locksmithNotNeeded && (needsScenes || !estateStarted)) {
    steps.push({
      key: 'locksmith',
      title: 'Log locksmith / first entry',
      hint: 'Optional. Records perimeter rekeying under Scene documentation, not heir inventory. Open the locksmith entry to add photos or mark Not needed there.',
      actionLabel: 'Start locksmith entry',
      onAction: onLogLocksmith,
      status: needsScenes ? 'active' : markStatus()
    });
  }

  // 2) Case dates.
  if (!hasLetters) {
    steps.push({
      key: 'letters',
      title: 'Set the Letters issued date',
      hint: 'Starts the probate countdown and anchors court deadlines.',
      actionLabel: 'Set Letters date',
      onAction: () => onOpenSettingsSection?.('case'),
      status: markStatus()
    });
  } else {
    const probate = resolveProbateWindow(settings || {});
    if (probate.needsEndDate || !probate.end) {
      steps.push({
        key: 'probate_end',
        title: 'Confirm the probate / claims window',
        hint: 'Set how long creditors have to make claims against the estate.',
        actionLabel: 'Edit probate window',
        onAction: () => onOpenSettingsSection?.('case'),
        status: markStatus()
      });
    }
  }

  // 3) Inventory rooms / items (stop nagging after certified complete).
  if (rooms <= 0) {
    steps.push({
      key: 'room',
      title: 'Create your first room',
      hint: 'Group items by room or category so the inventory stays organized.',
      actionLabel: 'Create room',
      onAction: onCreateCollection,
      status: markStatus()
    });
  } else if (!inventoryCertified) {
    steps.push({
      key: 'add_item',
      title: items > 0 ? 'Keep documenting property' : 'Add your first items',
      hint: 'Photo, title, room, and legal status for each item.',
      actionLabel: 'Add item',
      onAction: onAddItem,
      status: markStatus()
    });
  }

  // 4) Helpers — only nudge once inventory work has started and none exist.
  if (estateStarted && helpers <= 0 && (rooms > 0 || items > 0 || !needsScenes)) {
    steps.push({
      key: 'helpers',
      title: 'Add helpers (optional)',
      hint: 'Inventory takers photograph and describe items — you finish legal status in Pending review.',
      actionLabel: 'Manage helpers',
      onAction: () => onOpenSettingsSection?.('helper'),
      status: 'upcoming'
    });
  }

  // 5) Family access.
  if (heirs <= 0) {
    steps.push({
      key: 'heirs',
      title: 'Add family / heirs',
      hint: 'Create a PIN for each person so they can view inventory and send requests.',
      actionLabel: 'Manage family',
      onAction: () => onOpenSettingsSection?.('heirs'),
      status: markStatus()
    });
  } else {
    steps.push({
      key: 'invite',
      title: 'Share the family portal',
      hint: 'Copy a notice with the portal link so heirs know how to sign in.',
      actionLabel: 'Copy invite text',
      onAction: onCopyInvite,
      status: markStatus()
    });
  }

  // 6) Money — only after the estate has real work underway.
  if (estateStarted) {
    steps.push({
      key: 'ledger',
      title: 'Review the estate ledger',
      hint: 'Accounts, expenses, PR loans, distributions, and the estate balance in one place.',
      actionLabel: 'Open ledger',
      onAction: () => openLedger('summary'),
      status: 'upcoming'
    });
  }

  // 7) Later administration.
  if (inventoryCertified && heirs > 0) {
    steps.push({
      key: 'distribute',
      title: 'Distribute cash or property',
      hint: 'When the estate is ready, record equal/custom cash shares, property transfers, and receipts.',
      actionLabel: 'Open distributions',
      onAction: () => openLedger('distributions'),
      status: markStatus()
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
      status: markStatus()
    });
  }

  if (inventoryCertified && onOpenClosing) {
    steps.push({
      key: 'close',
      title: 'Close the estate',
      hint: 'Run the closing checklist and generate supporting exports. Review with counsel before filing.',
      actionLabel: 'Open closing checklist',
      onAction: onOpenClosing,
      status: 'upcoming'
    });
  }

  return steps
    .filter((s) => s.status === 'active' || s.status === 'upcoming')
    .slice(0, 5);
}

/**
 * Filter export-completeness gaps for the Needs attention home panel.
 * Keeps day-one noise down; export certificate still shows the full list.
 * Resolved Letters / inventory-complete must never stay as false positives —
 * use live settings flags (same truth as the accounting export).
 */
export function filterAttentionCompletenessGaps(exceptions = [], ctx = {}) {
  const {
    inventoryCount = 0,
    itemCount = 0,
    heirCount = 0,
    hasFinalizedDistributions = false,
    inventoryCompleted = false,
    lettersIssued = false,
    skipPendingReviewGap = false
  } = ctx;

  const rooms = Number(inventoryCount) || 0;
  const items = Number(itemCount) || 0;
  const heirs = Number(heirCount) || 0;
  const inventoryStarted = rooms > 0 || items > 0;
  const disclosureReady =
    inventoryCompleted || hasFinalizedDistributions || (heirs > 0 && inventoryStarted);

  return (exceptions || []).filter((row) => {
    const key = row?.key;
    if (!key) return false;
    // Drop gaps that live settings already satisfy (stale home bootstrap certificate).
    if (key === 'letters' && lettersIssued) return false;
    if (key === 'inventory_complete' && inventoryCompleted) return false;
    if (key === 'pending_review' && skipPendingReviewGap) return false;
    if (key === 'family_update' && !disclosureReady) return false;
    if (key === 'inventory_complete' && !inventoryStarted) return false;
    if (LATE_ATTENTION_GAPS.has(key)) {
      // Money / closing gaps only after inventory work has begun,
      // except family_update / inventory_complete which have their own gates above.
      if (key === 'family_update' || key === 'inventory_complete') return true;
      if (!inventoryStarted && !inventoryCompleted && !hasFinalizedDistributions) {
        return false;
      }
    }
    return true;
  });
}

/** Stable display order for attention gaps (workflow first, export later). */
export function sortAttentionCompletenessGaps(exceptions = []) {
  return [...(exceptions || [])].sort((a, b) => {
    const ai = ATTENTION_GAP_ORDER.indexOf(a.key);
    const bi = ATTENTION_GAP_ORDER.indexOf(b.key);
    const ao = ai === -1 ? 999 : ai;
    const bo = bi === -1 ? 999 : bi;
    return ao - bo;
  });
}

/** @deprecated Prefer buildWhatsNextSteps */
export const buildSteps = buildWhatsNextSteps;
