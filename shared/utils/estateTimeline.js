/**
 * Estate Vault — progress timeline.
 *
 * Derives a first-time executor's "where am I in the process?" checklist from
 * data the app already stores. Pure and side-effect free so it can be unit
 * tested and reused in exports later.
 */

import {
  resolveProbateWindow,
  resolveAuctionWindow,
  formatEstateLocalDate
} from './estateInventoryConstants.js';

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmt(value) {
  const d = toDate(value);
  return d ? formatEstateLocalDate(d) : null;
}

function daysRemaining(end, now) {
  const endDate = toDate(end);
  if (!endDate) return null;
  const endMs = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
  const diff = endMs - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

function formatMonthYear(value) {
  const d = toDate(value);
  if (!d) return null;
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * Summarize inventory / auction item rows for the timeline.
 * @param {Array} items
 */
export function summarizeTimelineItems(items = []) {
  const rows = items || [];
  let pendingReviewCount = 0;
  let approvedForSaleCount = 0;
  let activeItemCount = 0;
  let distributedCount = 0;

  for (const item of rows) {
    if (item?.review_status === 'pending_pr_review') pendingReviewCount += 1;
    if (item?.legal_status === 'archived') continue;
    if (item?.legal_status === 'distributed') {
      distributedCount += 1;
      continue;
    }
    activeItemCount += 1;
    if (item?.approved_for_sale) approvedForSaleCount += 1;
  }

  return {
    itemCount: rows.length,
    activeItemCount,
    pendingReviewCount,
    approvedForSaleCount,
    distributedCount
  };
}

/**
 * @param {object} params
 * @param {object} params.settings estate_settings row
 * @param {number} [params.roomCount] rooms/collections
 * @param {number} [params.itemCount]
 * @param {number} [params.pendingReviewCount]
 * @param {number} [params.approvedForSaleCount]
 * @param {boolean} [params.hasAuctionActivity]
 * @param {number} [params.distributionCount]
 * @param {number} [params.pendingAcknowledgementCount]
 * @param {Date}   [params.now]
 */
export function buildEstateTimeline({
  settings = {},
  roomCount = 0,
  itemCount = 0,
  pendingReviewCount = 0,
  approvedForSaleCount = 0,
  hasAuctionActivity = false,
  distributionCount = 0,
  pendingAcknowledgementCount = 0,
  // Back-compat with earlier callers that passed inventoryCount as room count
  inventoryCount,
  now = new Date()
} = {}) {
  const rooms = Number(roomCount || inventoryCount || 0);
  const items = Number(itemCount || 0);
  const pending = Number(pendingReviewCount || 0);
  const approvedForSale = Number(approvedForSaleCount || 0);
  const distributions = Number(distributionCount || 0);
  const pendingAcknowledgements = Number(pendingAcknowledgementCount || 0);

  const probate = resolveProbateWindow(settings);
  const auction = resolveAuctionWindow(settings, now);
  const lettersDate = fmt(settings.letters_issued_at);
  const probateEnded = probate.end ? now > probate.end : false;
  const remainingDays = probate.end && !probateEnded ? daysRemaining(probate.end, now) : null;
  const closedDate = fmt(settings.closed_at);
  const estateClosed = Boolean(settings.closed_at);

  // Inventory completion is an explicit PR certification — never infer it from
  // item count or an empty helper review queue.
  const inventoryCompleted = Boolean(settings.inventory_completed_at);
  let inventoryTitle = 'Inventory';
  let inventoryNote = 'Add rooms and items to build the inventory';
  if (inventoryCompleted) {
    inventoryTitle = 'Inventory complete';
    inventoryNote = `Marked complete ${fmt(settings.inventory_completed_at)}`;
  } else if (items > 0 || rooms > 0) {
    if (pending > 0) {
      inventoryTitle = 'Inventory in progress';
      inventoryNote = `${items || rooms} recorded · ${pending} awaiting PR review`;
    } else if (items > 0) {
      inventoryTitle = 'Inventory in progress';
      inventoryNote =
        rooms > 0
          ? `${items} item(s) across ${rooms} room(s) · PR must mark complete`
          : `${items} item(s) recorded · PR must mark complete`;
    } else {
      inventoryTitle = 'Inventory started';
      inventoryNote = `${rooms} room(s) · add items next`;
    }
  }

  // Auction is optional. Unscheduled with nothing for sale does not block closure.
  let auctionTitle = 'Auction';
  let auctionNote = 'Optional — set auction dates if you will sell items';
  let auctionDone = false;
  if (auction.phase === 'ended') {
    auctionTitle = 'Auction complete';
    auctionNote = auction.label;
    auctionDone = true;
  } else if (auction.phase === 'open') {
    auctionTitle = 'Auction open';
    auctionNote = auction.label;
  } else if (auction.phase === 'upcoming') {
    auctionTitle = 'Auction scheduled';
    auctionNote = auction.label;
  } else if (approvedForSale > 0 || hasAuctionActivity) {
    auctionTitle = 'Auction';
    auctionNote =
      approvedForSale > 0
        ? `${approvedForSale} item(s) approved for sale — set auction dates`
        : 'Bids recorded — set or confirm auction dates';
  } else {
    // Nothing to sell / no dates → treat as complete so the timeline can move on.
    auctionDone = true;
    auctionNote = 'Not scheduled (optional)';
  }

  let claimsTitle = 'Claims / probate window';
  let claimsNote = 'Probate window not configured';
  if (probate.needsLetters) {
    claimsNote = 'Set the Letters date to start the countdown';
  } else if (probate.needsEndDate) {
    claimsNote = 'Set a probate end date in Settings';
  } else if (probate.end) {
    if (probateEnded) {
      claimsTitle = 'Claims period ended';
      claimsNote = `Closed ${fmt(probate.end)}`;
    } else if (remainingDays != null) {
      claimsTitle = 'Claims period open';
      claimsNote =
        remainingDays === 1
          ? `1 day remaining · ends ${fmt(probate.end)}`
          : `${remainingDays} days remaining · ends ${fmt(probate.end)}`;
    }
  }

  const defs = [
    {
      key: 'case_opened',
      title: 'Case opened',
      done: true,
      note: fmt(settings.created_at)
        ? `Started ${fmt(settings.created_at)}`
        : 'Estate record created'
    },
    {
      key: 'letters',
      title: 'Letters received',
      done: Boolean(settings.letters_issued_at),
      note: lettersDate
        ? `Issued ${lettersDate}`
        : 'Add the date the court issued your Letters'
    },
    {
      key: 'inventory',
      title: inventoryTitle,
      done: inventoryCompleted,
      note: inventoryNote
    },
    {
      key: 'claims_window',
      title: claimsTitle,
      done: probateEnded || estateClosed,
      note: claimsNote
    },
    {
      key: 'auction',
      title: auctionTitle,
      done: auctionDone || estateClosed,
      note: auctionNote
    },
    {
      key: 'distributions',
      title:
        distributions > 0
          ? pendingAcknowledgements > 0
            ? 'Distributions awaiting receipts'
            : 'Distributions recorded'
          : 'Distributions',
      done: (distributions > 0 && pendingAcknowledgements === 0) || estateClosed,
      note:
        distributions > 0
          ? pendingAcknowledgements > 0
            ? `${distributions} finalized · ${pendingAcknowledgements} acknowledgement(s) pending`
            : `${distributions} finalized with receipts acknowledged`
          : 'Distribute cash and property, then collect receipts'
    },
    {
      key: 'closed',
      title: 'Estate closed',
      done: estateClosed,
      note: closedDate ? `Closed ${closedDate}` : 'Final step once everything is distributed'
    }
  ];

  const firstOpen = defs.findIndex((s) => !s.done);
  const steps = defs.map((s, i) => ({
    key: s.key,
    title: s.title,
    note: s.note,
    status: s.done ? 'done' : i === firstOpen ? 'active' : 'upcoming'
  }));

  // Expectation setter — not legal advice. Prefer the later of claims end / auction end.
  const estimateCandidates = [probate.end, toDate(settings.auction_end_date)].filter(Boolean);
  let estimatedCompletion = null;
  if (estimateCandidates.length) {
    const latest = estimateCandidates.reduce((a, b) => (a > b ? a : b));
    estimatedCompletion = formatMonthYear(latest);
  }

  return {
    steps,
    completedCount: defs.filter((s) => s.done).length,
    totalCount: defs.length,
    activeKey: firstOpen >= 0 ? defs[firstOpen].key : null,
    remainingClaimsDays: remainingDays,
    estimatedCompletion
  };
}
