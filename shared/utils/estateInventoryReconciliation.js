/**
 * Estate Vault — inventory / auction state reconciliation.
 *
 * Every item lands in exactly one disposition bucket so "14 lots vs 15"
 * style trust gaps become visible and countable.
 */

import { APP_NAME, LEGAL_STATUS } from './estateInventoryConstants.js';
import { formatMoney } from './estateFinance.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Exclusive disposition for one inventory row.
 * Priority order is intentional — auction/payment state outranks generic secured.
 */
export function resolveItemDisposition(item = {}) {
  const status = item.legal_status;
  const bid = Number(item.highest_bid) || 0;

  if (status === LEGAL_STATUS.archived) {
    return { key: 'archived', label: 'Archived' };
  }
  if (status === LEGAL_STATUS.distributed) {
    return { key: 'distributed', label: 'Distributed' };
  }
  if (status === LEGAL_STATUS.unauthorized_removal) {
    return { key: 'missing', label: 'Missing / unauthorized removal' };
  }
  if (item.auction_paid_at && bid > 0) {
    return { key: 'auction_paid', label: 'Auction sold — paid' };
  }
  if (bid > 0) {
    return { key: 'auction_pending', label: 'Auction sold — payment pending' };
  }
  if (item.approved_for_sale) {
    return { key: 'auction_approved', label: 'Auction approved (no bid yet)' };
  }
  if (status === LEGAL_STATUS.disputed) {
    return { key: 'disputed', label: 'Disputed' };
  }
  if (status === LEGAL_STATUS.claimed_memorandum) {
    return { key: 'claimed', label: 'Claimed via memorandum' };
  }
  if (item.review_status === 'pending_pr_review') {
    return { key: 'pending_review', label: 'Pending PR review' };
  }
  return { key: 'held', label: 'Held / remaining in estate' };
}

const BUCKET_ORDER = [
  'held',
  'pending_review',
  'claimed',
  'disputed',
  'auction_approved',
  'auction_pending',
  'auction_paid',
  'distributed',
  'missing',
  'archived'
];

/** Same gates as estate_list_auction_items public catalog. */
export function auctionListingBlockReason(item = {}) {
  if (!item.approved_for_sale && !(Number(item.highest_bid) > 0) && !item.auction_paid_at) {
    return 'Not approved for auction';
  }
  const review = item.review_status == null ? 'approved' : item.review_status;
  if (review !== 'approved') return 'Pending PR review';
  if (item.legal_status === LEGAL_STATUS.claimed_memorandum) {
    return 'Claimed via memorandum';
  }
  if (item.legal_status === LEGAL_STATUS.disputed) return 'Disputed';
  if (item.legal_status === LEGAL_STATUS.distributed) return 'Already distributed';
  if (item.legal_status === LEGAL_STATUS.archived) return 'Archived';
  if (item.legal_status === LEGAL_STATUS.unauthorized_removal) {
    return 'Missing / unauthorized removal';
  }
  return null;
}

export function isAuctionCatalogListed(item = {}) {
  return item.approved_for_sale === true && !auctionListingBlockReason(item);
}

/**
 * Count unique distributed property items from distribution records.
 * Needed when browse lists intentionally exclude distributed rows.
 */
export function countDistributedItemsFromDistributions(distributions = []) {
  const ids = new Set();
  for (const row of distributions || []) {
    if (row?.status && row.status !== 'finalized') continue;
    for (const item of row.items || []) {
      const id = item.item_id || item.id;
      if (id) ids.add(id);
    }
    for (const recipient of row.recipients || []) {
      for (const item of recipient.items || []) {
        const id = item.item_id || item.id;
        if (id) ids.add(id);
      }
    }
  }
  return ids.size;
}

/**
 * Family/PR-facing inventory totals that stay consistent even when the current
 * screen's item list omits distributed/archived rows.
 */
export function buildConsistentInventoryCounts({
  items = [],
  distributions = [],
  reconciliation = null
} = {}) {
  if (reconciliation) {
    const archived = reconciliation.allBuckets?.find((b) => b.key === 'archived')?.count || 0;
    return {
      total: reconciliation.total,
      active: Math.max(
        0,
        reconciliation.total - reconciliation.distributedCount - archived
      ),
      distributed: reconciliation.distributedCount,
      archived,
      approvedForSale: reconciliation.auctionLotCount,
      auctionPaid: reconciliation.auctionPaidCount,
      auctionPending: reconciliation.auctionPendingCount,
      auctionApprovedOnly: reconciliation.auctionApprovedOnlyCount,
      source: 'reconciliation'
    };
  }

  let active = 0;
  let distributed = 0;
  let archived = 0;
  let approvedForSale = 0;
  let auctionPaid = 0;
  let auctionPending = 0;
  let auctionApprovedOnly = 0;

  for (const item of items || []) {
    const disposition = resolveItemDisposition(item);
    if (disposition.key === 'archived') {
      archived += 1;
      continue;
    }
    if (disposition.key === 'distributed') {
      distributed += 1;
      continue;
    }
    active += 1;
    if (disposition.key === 'auction_paid') auctionPaid += 1;
    else if (disposition.key === 'auction_pending') auctionPending += 1;
    else if (disposition.key === 'auction_approved') auctionApprovedOnly += 1;
    if (item.approved_for_sale || Number(item.highest_bid) > 0 || item.auction_paid_at) {
      approvedForSale += 1;
    }
  }

  const fromRecords = countDistributedItemsFromDistributions(distributions);
  const hiddenDistributed = Math.max(0, fromRecords - distributed);
  distributed += hiddenDistributed;

  return {
    total: active + distributed + archived,
    active,
    distributed,
    archived,
    approvedForSale,
    auctionPaid,
    auctionPending,
    auctionApprovedOnly,
    source: hiddenDistributed > 0 ? 'browse_plus_distributions' : 'items'
  };
}

/**
 * Explains approved vs listed auction lots so 15 vs 14 never looks like theft.
 * listedCount uses the same catalog gates as estate_list_auction_items /
 * isAuctionCatalogListed — sold lots only count as listed when still catalog-eligible.
 */
export function buildAuctionStatusBreakdown(items = []) {
  const approved = [];
  const listed = [];
  const notListed = [];
  const soldPending = [];
  const soldPaid = [];

  for (const item of items || []) {
    if (item.legal_status === LEGAL_STATUS.archived) continue;
    const bid = Number(item.highest_bid) || 0;
    const inAuctionPipeline =
      item.approved_for_sale || bid > 0 || Boolean(item.auction_paid_at);
    if (!inAuctionPipeline) continue;

    approved.push(item);

    if (item.auction_paid_at && bid > 0) soldPaid.push(item);
    else if (bid > 0) soldPending.push(item);

    if (item.approved_for_sale) {
      if (isAuctionCatalogListed(item)) {
        listed.push(item);
      } else {
        notListed.push({
          ...item,
          not_listed_reason: auctionListingBlockReason(item) || 'Not on public sale/auction catalog'
        });
      }
    }
  }

  return {
    approvedCount: approved.length,
    listedCount: listed.length,
    listedOpenCount: listed.filter(
      (item) => !(Number(item.highest_bid) > 0) && !item.auction_paid_at
    ).length,
    notListedCount: notListed.length,
    soldPendingCount: soldPending.length,
    soldPaidCount: soldPaid.length,
    approved,
    listed,
    notListed,
    soldPending,
    soldPaid,
    summaryLabel:
      notListed.length > 0
        ? `${approved.length} approved · ${listed.length} on sale/auction catalog · ${notListed.length} approved but not listed`
        : `${approved.length} approved sale/auction lot(s) · ${soldPaid.length} paid · ${soldPending.length} pending payment`
  };
}

/**
 * @param {Array} items
 */
export function buildInventoryReconciliation(items = []) {
  const buckets = Object.fromEntries(
    BUCKET_ORDER.map((key) => [key, { key, label: '', count: 0, items: [] }])
  );

  for (const item of items || []) {
    const disposition = resolveItemDisposition(item);
    const bucket = buckets[disposition.key];
    if (!bucket) continue;
    bucket.label = disposition.label;
    bucket.count += 1;
    bucket.items.push({
      id: item.id,
      name: item.name,
      room: item.room_name || item.collection_name || null,
      highest_bid: item.highest_bid,
      estimated_value: item.estimated_value,
      disposition: disposition.key
    });
  }

  const rows = BUCKET_ORDER.map((key) => buckets[key]).filter((row) => row.count > 0);
  const total = (items || []).length;
  const counted = rows.reduce((sum, row) => sum + row.count, 0);
  const auctionApproved =
    (buckets.auction_approved?.count || 0) +
    (buckets.auction_pending?.count || 0) +
    (buckets.auction_paid?.count || 0);
  const auctionBreakdown = buildAuctionStatusBreakdown(items);

  return {
    total,
    counted,
    balanced: total === counted,
    auctionLotCount: auctionApproved,
    auctionPaidCount: buckets.auction_paid?.count || 0,
    auctionPendingCount: buckets.auction_pending?.count || 0,
    auctionApprovedOnlyCount: buckets.auction_approved?.count || 0,
    distributedCount: buckets.distributed?.count || 0,
    heldCount: buckets.held?.count || 0,
    auctionBreakdown,
    buckets: rows,
    allBuckets: BUCKET_ORDER.map((key) => ({
      key,
      label: buckets[key].label || key,
      count: buckets[key].count
    }))
  };
}

export function buildInventoryReconciliationHtml({
  reconciliation,
  estateName = 'Estate',
  caseNumber = null
} = {}) {
  const r = reconciliation || buildInventoryReconciliation([]);
  const caseLabel = caseNumber || 'estate';
  const summaryRows = (r.allBuckets || [])
    .map(
      (bucket) => `<tr>
      <td>${esc(bucket.label || bucket.key)}</td>
      <td>${esc(bucket.count)}</td>
    </tr>`
    )
    .join('');

  const auction = r.auctionBreakdown || buildAuctionStatusBreakdown([]);
  const notListedRows = (auction.notListed || [])
    .map(
      (item) => `<tr>
      <td>${esc(item.name)}</td>
      <td>${esc(item.not_listed_reason || '—')}</td>
    </tr>`
    )
    .join('');

  const detailSections = (r.buckets || [])
    .map((bucket) => {
      const lines = (bucket.items || [])
        .map(
          (item) => `<tr>
          <td>${esc(item.name)}</td>
          <td>${esc(item.room || '—')}</td>
          <td>${
            item.highest_bid != null && Number(item.highest_bid) > 0
              ? formatMoney(item.highest_bid)
              : item.estimated_value != null
                ? formatMoney(item.estimated_value)
                : '—'
          }</td>
        </tr>`
        )
        .join('');
      return `<h2>${esc(bucket.label)} (${esc(bucket.count)})</h2>
      <table><thead><tr><th>Item</th><th>Room</th><th>Value / bid</th></tr></thead>
      <tbody>${lines || '<tr><td colspan="3">None</td></tr>'}</tbody></table>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(APP_NAME)} — Inventory reconciliation — ${esc(caseLabel)}</title>
<style>
body{font-family:Georgia,"Times New Roman",serif;color:#1c1917;max-width:860px;margin:28px auto;padding:0 20px}
h1{font-size:1.45rem;margin:0 0 .2rem}h2{font-size:1.05rem;border-bottom:2px solid #78716c;padding-bottom:.2rem;margin:1.2rem 0 .45rem}
.meta,.muted{color:#57534e}.notice{border:1px solid #a8a29e;background:#fff;padding:.75rem;margin:1rem 0}
table{width:100%;border-collapse:collapse;background:#fff;margin:.4rem 0 1rem}
th,td{border:1px solid #d6d3d1;padding:.4rem;text-align:left;font-size:.84rem}th{background:#f5f5f4}
.toolbar{margin-bottom:1rem}@media print{.toolbar{display:none}}
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
<h1>${esc(APP_NAME)} — Inventory Reconciliation</h1>
<div class="meta">${esc(estateName)} · Case ${esc(caseLabel)}</div>
<div class="notice">
  <strong>Every item has exactly one disposition.</strong>
  Total items: <strong>${esc(r.total)}</strong>
  · Distributed: <strong>${esc(r.distributedCount)}</strong>
  · Sale/auction pipeline: <strong>${esc(r.auctionLotCount)}</strong>
</div>
<div class="notice">
  <strong>Auction catalog reconciliation:</strong>
  ${esc(auction.approvedCount)} approved ·
  ${esc(auction.listedCount)} on catalog (open/sold) ·
  ${esc(auction.notListedCount)} approved but not listed ·
  ${esc(auction.soldPaidCount)} paid ·
  ${esc(auction.soldPendingCount)} payment pending.
  “Listed” matches the public sale/auction catalog rules (approved, review cleared, not disputed/claimed/distributed).
</div>
<table><thead><tr><th>Disposition</th><th>Count</th></tr></thead>
<tbody>${summaryRows}</tbody></table>
<h2>Approved but not on auction catalog</h2>
<table><thead><tr><th>Item</th><th>Reason</th></tr></thead>
<tbody>${notListedRows || '<tr><td colspan="2">None — approved lots match the catalog</td></tr>'}</tbody></table>
${detailSections}
<p class="muted">Generated ${esc(new Date().toLocaleString())}</p>
</body></html>`;
}

export function openInventoryReconciliation(input) {
  const win = window.open('', '_blank');
  if (!win) return { success: false, error: 'Popup blocked. Allow popups and try again.' };
  win.document.open();
  win.document.write(buildInventoryReconciliationHtml(input));
  win.document.close();
  return { success: true };
}
