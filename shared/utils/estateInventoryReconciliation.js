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
  Auction “approved lots” = approved with no bid + sold pending + sold paid.
  Total items: <strong>${esc(r.total)}</strong>
  · Counted: <strong>${esc(r.counted)}</strong>
  · Auction lots: <strong>${esc(r.auctionLotCount)}</strong>
</div>
<table><thead><tr><th>Disposition</th><th>Count</th></tr></thead>
<tbody>${summaryRows}</tbody></table>
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
