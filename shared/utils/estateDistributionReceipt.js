import { APP_NAME, distributionClassificationLabel } from './estateInventoryConstants.js';
import { formatMoney } from './estateFinance.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function finalizedDistributions(rows = []) {
  return (rows || []).filter((row) => row?.status === 'finalized');
}

export function sumDistributionCash(rows = []) {
  return finalizedDistributions(rows).reduce(
    (sum, row) => sum + (Number(row?.cash_total) || 0),
    0
  );
}

export function sumDistributionPropertyValue(rows = []) {
  return finalizedDistributions(rows).reduce(
    (sum, row) => sum + (Number(row?.property_value_total) || 0),
    0
  );
}

export function distributionRecipientCount(rows = []) {
  return finalizedDistributions(rows).reduce(
    (sum, row) => sum + (row?.recipients?.length || 0),
    0
  );
}

/**
 * Current-balance reconciliation. This is a fiduciary schedule, not tax
 * accounting: the PR must update account balances after cash leaves the estate.
 */
export function buildDistributionAccounting({ finance = {}, distributions = [] } = {}) {
  const cashDistributed = sumDistributionCash(distributions);
  const propertyDistributed = sumDistributionPropertyValue(distributions);
  const endingBalance = Number(finance?.netDistributable) || 0;
  return {
    cashDistributed,
    propertyDistributed,
    totalDistributed: cashDistributed + propertyDistributed,
    endingBalance,
    accountedValue: endingBalance + cashDistributed + propertyDistributed
  };
}

export function buildDistributionReceiptHtml({
  distribution,
  recipient,
  estateName,
  caseNumber
}) {
  const items = recipient?.items || [];
  const itemRows = items.length
    ? items
        .map((item) => {
          const recorded = item.transferred_at
            ? new Date(item.transferred_at).toLocaleString()
            : null;
          return `<tr>
            <td>${esc(item.item_name)}</td>
            <td>${formatMoney(item.estimated_value_snapshot ?? item.estimated_value)}</td>
            <td>${esc(distribution.distribution_date || '—')}${
              recorded
                ? `<div style="color:#555;font-size:12px;margin-top:4px">Recorded ${esc(recorded)}</div>`
                : ''
            }</td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="3">No property in this distribution</td></tr>';
  const acknowledgement =
    recipient?.acknowledgement_status === 'acknowledged'
      ? `Electronically acknowledged ${esc(
          new Date(recipient.acknowledged_at).toLocaleString()
        )}`
      : 'Recipient acknowledgement pending';

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Distribution receipt — ${esc(recipient?.recipient_name)}</title>
<style>
body{font-family:Arial,sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 20px}
h1{font-size:22px;margin-bottom:4px}.meta{color:#555;margin-bottom:24px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}
.box{border:1px solid #aaa;padding:12px;border-radius:6px}
table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #bbb;padding:8px;text-align:left}
.signature{margin-top:44px;display:grid;grid-template-columns:1fr 180px;gap:30px}
.line{border-top:1px solid #111;padding-top:5px}.notice{margin-top:25px;padding:12px;background:#f3f4f6}
@media print{button{display:none}body{margin:0}}
</style></head><body>
<button onclick="window.print()">Print / Save as PDF</button>
<h1>${esc(APP_NAME)} — Distribution Receipt</h1>
<div class="meta">${esc(estateName || 'Estate')} · Case ${esc(caseNumber || '—')}</div>
<div class="grid">
  <div class="box"><strong>Recipient</strong><br>${esc(recipient?.recipient_name || '—')}</div>
  <div class="box"><strong>Distribution date (effective)</strong><br>${esc(distribution?.distribution_date || '—')}</div>
  <div class="box"><strong>Type</strong><br>${esc(
    distribution?.classificationLabel ||
      distributionClassificationLabel(distribution?.classification)
  )}</div>
  <div class="box"><strong>Cash received</strong><br>${formatMoney(recipient?.cash_amount)}</div>
  <div class="box"><strong>Share</strong><br>${recipient?.share_percent ? `${esc(recipient.share_percent)}%` : 'Custom / property only'}</div>
</div>
<h2>Property received</h2>
<table><thead><tr><th>Item</th><th>Recorded value</th><th>Effective date</th></tr></thead><tbody>${itemRows}</tbody></table>
<div class="notice"><strong>Status:</strong> ${acknowledgement}<br>
<strong>Dates:</strong> The distribution date is the effective date of this batch. Any “Recorded …” time is when Estate Vault saved the transfer — it may differ if the PR dated the batch for a different day.
</div>
<p>I acknowledge receipt of the cash and/or property listed above from this estate.</p>
<div class="signature">
  <div class="line">Recipient signature</div>
  <div class="line">Date</div>
</div>
</body></html>`;
}

function receiptFileName(input = {}) {
  const who = String(input.recipient?.recipient_name || 'recipient')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 40);
  const when = String(input.distribution?.distribution_date || 'receipt').replace(/[^\d-]/g, '');
  return `estate-distribution-receipt-${who}-${when || 'download'}.html`;
}

/** Preferred path: save receipt HTML locally (no popup required). */
export function downloadDistributionReceipt(input) {
  try {
    const html = buildDistributionReceiptHtml(input);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = receiptFileName(input);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Could not download the receipt.'
    };
  }
}

/** Fallback: open printable receipt in a new tab. */
export function openDistributionReceipt(input) {
  const win = window.open('', '_blank');
  if (!win) return { success: false, error: 'Popup blocked. Allow popups and try again.' };
  win.document.open();
  win.document.write(buildDistributionReceiptHtml(input));
  win.document.close();
  return { success: true };
}

