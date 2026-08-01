/**
 * Estate Vault — disclosure / transparency timeline.
 *
 * Answers the heir question: "Why don't I see final numbers yet?"
 * Pure helper built from settings + inventory/auction/distribution signals.
 * This is staged process communication — not live bank access.
 */

import {
  resolveProbateWindow,
  resolveAuctionWindow,
  formatEstateDisplayDate
} from './estateInventoryConstants.js';
import {
  buildAuctionStatusBreakdown,
  buildConsistentInventoryCounts
} from './estateInventoryReconciliation.js';

function fmt(value) {
  return formatEstateDisplayDate(value);
}

/**
 * @param {object} params
 * @param {object} params.settings
 * @param {Array}  [params.items] may omit distributed rows (family browse)
 * @param {Array}  [params.distributions] used to recover distributed counts
 * @param {object} [params.inventoryCounts] optional precomputed consistent counts
 * @param {object} [params.auctionBreakdown] optional precomputed auction breakdown
 * @param {Date}   [params.now]
 */
export function buildDisclosureTimeline({
  settings = {},
  items = [],
  distributions = [],
  inventoryCounts = null,
  auctionBreakdown = null,
  now = new Date()
} = {}) {
  const probate = resolveProbateWindow(settings);
  const auction = resolveAuctionWindow(settings, now);
  const inventory =
    inventoryCounts ||
    buildConsistentInventoryCounts({ items, distributions });
  const auctionStatus =
    auctionBreakdown || buildAuctionStatusBreakdown(items);
  const finalized = (distributions || []).filter(
    (row) => !row.status || row.status === 'finalized'
  );
  const firstDistribution = finalized
    .map((row) => row.distribution_date || row.finalized_at)
    .filter(Boolean)
    .sort()[0];
  const probateEnded = probate.end ? now > probate.end : false;
  const inventoryComplete = Boolean(settings.inventory_completed_at);
  const estateClosed = Boolean(settings.closed_at);
  const hasPreliminaryAccounting =
    finalized.length > 0 || Number(inventory.approvedForSale) > 0;

  const events = [];

  events.push({
    key: 'case_opened',
    date: settings.created_at || null,
    dateLabel: fmt(settings.created_at) || 'Date not recorded',
    title: 'Estate record opened',
    detail: 'Administration workspace created in Estate Vault.',
    status: 'done'
  });

  events.push({
    key: 'letters',
    date: settings.letters_issued_at || null,
    dateLabel: fmt(settings.letters_issued_at),
    title: 'Letters issued',
    detail: settings.letters_issued_at
      ? 'Personal Representative authority documented.'
      : 'Letters date not set yet — probate countdown waits on this.',
    status: settings.letters_issued_at ? 'done' : 'upcoming'
  });

  const inventoryDetail = inventoryComplete
    ? `${inventory.total} total item(s) · ${inventory.active} currently active · ${inventory.distributed} distributed`
    : inventory.active > 0 || inventory.distributed > 0
      ? `${inventory.total || inventory.active} item(s) on record · PR has not certified completion yet`
      : 'Family inventory disclosure begins once items are recorded.';

  events.push({
    key: 'inventory_shared',
    date: settings.inventory_completed_at || null,
    dateLabel: inventoryComplete
      ? fmt(settings.inventory_completed_at)
      : inventory.active > 0 || inventory.distributed > 0
        ? 'In progress'
        : null,
    title: inventoryComplete
      ? 'Inventory certified complete'
      : inventory.active > 0 || inventory.distributed > 0
        ? 'Inventory available to beneficiaries'
        : 'Inventory not started',
    detail: inventoryDetail,
    status: inventoryComplete
      ? 'done'
      : inventory.active > 0 || inventory.distributed > 0
        ? 'active'
        : 'upcoming'
  });

  if (
    auction.startDate ||
    auction.endDate ||
    inventory.approvedForSale > 0 ||
    auctionStatus.approvedCount > 0
  ) {
    let auctionEventStatus = 'upcoming';
    let auctionTitle = 'Sale/auction scheduled';
    let auctionDetail = auctionStatus.summaryLabel || auction.label;

    if (auction.phase === 'open') {
      auctionEventStatus = 'active';
      auctionTitle = 'Sale/auction open';
    } else if (auction.phase === 'ended') {
      auctionEventStatus = 'done';
      auctionTitle = 'Sale/auction window ended';
    } else if (!auction.startDate && auctionStatus.approvedCount > 0) {
      auctionEventStatus = 'active';
      auctionTitle = 'Items approved for sale/auction';
    }

    if (auctionStatus.notListedCount > 0) {
      auctionDetail = `${auctionStatus.summaryLabel}. Not listed: ${auctionStatus.notListed
        .slice(0, 3)
        .map((item) => `${item.name} (${item.not_listed_reason})`)
        .join('; ')}${
        auctionStatus.notListedCount > 3
          ? ` +${auctionStatus.notListedCount - 3} more`
          : ''
      }`;
    }

    events.push({
      key: 'auction',
      date: auction.startDate || null,
      dateLabel:
        fmt(auction.startDate) || (auction.endDate ? `Ends ${fmt(auction.endDate)}` : null),
      title: auctionTitle,
      detail: auctionDetail,
      status: auctionEventStatus
    });
  }

  events.push({
    key: 'claims',
    date: probate.end || null,
    dateLabel: fmt(probate.end),
    title: probateEnded ? 'Claims / probate window closed' : 'Claims / probate window',
    detail: probateEnded
      ? `Creditor claims period ended ${fmt(probate.end)}.`
      : probate.end
        ? `Open until ${fmt(probate.end)}. Final accounting usually waits until this closes.`
        : 'Configure Letters and the probate window to set this milestone.',
    status: probateEnded ? 'done' : probate.end ? 'active' : 'upcoming'
  });

  events.push({
    key: 'distributions',
    date: firstDistribution || null,
    dateLabel: firstDistribution ? fmt(firstDistribution) : null,
    title: finalized.length
      ? `${finalized.length} distribution batch(es) recorded`
      : 'Distributions',
    detail: finalized.length
      ? `${inventory.distributed} property item(s) transferred across recorded batches — not necessarily the final residual split.`
      : 'No distributions recorded yet.',
    status: finalized.length ? 'done' : 'upcoming'
  });

  events.push({
    key: 'preliminary_accounting',
    date: null,
    dateLabel: hasPreliminaryAccounting ? 'Available via published Family Updates' : null,
    title: 'Preliminary / staged accounting',
    detail: probateEnded
      ? 'Claims window has closed — family update and formal accounting can proceed.'
      : 'Final numbers are not expected while the claims window is still open or inventory/sale/auction work remains.',
    status: estateClosed ? 'done' : probateEnded && inventoryComplete ? 'active' : 'upcoming'
  });

  events.push({
    key: 'final_accounting',
    date: settings.closed_at || null,
    dateLabel: fmt(settings.closed_at),
    title: estateClosed ? 'Estate closed for records' : 'Final accounting & residual close',
    detail: estateClosed
      ? `Closed ${fmt(settings.closed_at)}${settings.close_reason ? ` · ${settings.close_reason}` : ''}`
      : 'Target after claims close, sale/auction settlement, distributions, and formal accounting.',
    status: estateClosed ? 'done' : 'upcoming'
  });

  const active = events.find((event) => event.status === 'active');
  const whyNotFinal = estateClosed
    ? 'The estate is closed for records. Final figures are preserved in the court evidence pack and formal accounting.'
    : !probateEnded
      ? 'Final accounting is not expected yet because the claims / probate window is still open (or not fully configured).'
      : !inventoryComplete
        ? 'Inventory has not been certified complete by the Personal Representative.'
        : auction.phase === 'open'
          ? 'The sale/auction is still open — expected proceeds are not fully settled.'
          : 'The estate is past the claims window; ask the PR for a Family Update or formal accounting if you need the current staged numbers.';

  return {
    events,
    currentKey: active?.key || (estateClosed ? 'final_accounting' : null),
    whyNotFinal,
    probateEnded,
    inventoryComplete,
    estateClosed,
    inventory,
    auctionStatus
  };
}
