/**
 * Estate Vault — completeness certificate for supporting reports.
 *
 * Separates "printable supporting export" from "complete enough for counsel
 * filing prep." Estate Vault is a PR operating system — reports support court
 * work; they are not court filings.
 */

import {
  VALUE_TIER,
  parseEstateLocalDate,
  formatEstateDisplayDate
} from './estateInventoryConstants.js';
import { distributionsNeedBalanceUpdate } from './estateClosingReadiness.js';
import {
  buildAuctionStatusBreakdown,
  buildInventoryReconciliation
} from './estateInventoryReconciliation.js';
import { getPhotoEntries } from './estatePhotoMeta.js';

export const ESTATE_SUPPORTING_DOCS_LABEL =
  'Estate administration records and court-supporting reports. Review with counsel before filing.';

const SAMPLE_LIMIT = 12;

function hasPhoto(item) {
  return getPhotoEntries(item).length > 0;
}

function isHighRiskItem(item = {}) {
  return (
    item.value_tier === VALUE_TIER.high_value ||
    item.approved_for_sale === true ||
    Number(item.estimated_value) >= 500 ||
    Number(item.highest_bid) > 0
  );
}

/** Normalize rows to { id, name } for UI + exports. Keep exception keys stable. */
export function sampleRecords(rows, mapFn, limit = SAMPLE_LIMIT) {
  return (rows || [])
    .map(mapFn)
    .filter((row) => row && (row.id || row.name))
    .slice(0, limit)
    .map((row) => ({
      id: String(row.id || '').trim(),
      name: String(row.name || row.id || 'Record').trim() || 'Record'
    }));
}

/**
 * @param {object} params
 * @param {object} [params.settings]
 * @param {object} [params.finance]
 * @param {Array}  [params.distributions]
 * @param {Array}  [params.items]
 * @param {Array}  [params.expenses]
 * @param {Array}  [params.scenes]
 * @param {number} [params.pendingReviewCount]
 * @param {boolean} [params.claimsEnded]
 * @param {boolean} [params.familyUpdatePublished]
 */
export function buildCompletenessCertificate({
  settings = {},
  finance = {},
  distributions = [],
  items = [],
  expenses = [],
  scenes = [],
  pendingReviewCount = 0,
  claimsEnded = false,
  familyUpdatePublished = false
} = {}) {
  const balanceCheck = distributionsNeedBalanceUpdate({
    accounts: finance.accounts || [],
    distributions,
    fundTransactions: finance.fundTransactions
  });
  const auction = buildAuctionStatusBreakdown(items);
  const recon = buildInventoryReconciliation(items);
  const finalized = (distributions || []).filter((row) => row?.status === 'finalized');

  const pendingAckRecipients = [];
  for (const row of finalized) {
    for (const recipient of row.recipients || []) {
      const s = String(recipient.acknowledgement_status || 'pending').toLowerCase();
      if (s === 'pending' || s === 'noticed' || s === 'reminded') {
        pendingAckRecipients.push({
          id: String(recipient.id || `${row.id}:${recipient.sibling_key || ''}`),
          name:
            String(recipient.display_name || recipient.recipient_name || '').trim() ||
            `Recipient on ${formatEstateDisplayDate(row.distribution_date) || 'distribution'}`
        });
      }
    }
  }

  const expensesMissingReceipt = (expenses || []).filter(
    (row) => !String(row.receipt_url || '').trim()
  );
  const highRiskMissingPhoto = (items || []).filter(
    (item) =>
      item.legal_status !== 'archived' &&
      item.legal_status !== 'distributed' &&
      isHighRiskItem(item) &&
      !hasPhoto(item)
  );
  const inventoryMissingPhoto = (items || []).filter(
    (item) =>
      item.legal_status !== 'archived' &&
      item.legal_status !== 'distributed' &&
      !hasPhoto(item)
  );

  const interimCashDistributions = !claimsEnded
    ? finalized.filter((row) => Number(row.cash_total) > 0)
    : [];

  const lettersLabel = formatEstateDisplayDate(settings.letters_issued_at);
  const lettersRaw = settings.letters_issued_at
    ? String(settings.letters_issued_at).slice(0, 10)
    : null;

  const exceptions = [];

  const push = (severity, key, label, detail, blockFinal = severity === 'block', samples = [], samplesTotal = null) => {
    const list = Array.isArray(samples) ? samples : [];
    exceptions.push({
      severity,
      key,
      label,
      detail,
      blockFinal,
      samples: list,
      samplesTotal: Number.isFinite(Number(samplesTotal)) ? Number(samplesTotal) : list.length
    });
  };

  if (balanceCheck.stale) {
    const full =
      balanceCheck.missingDistributions?.length > 0
        ? balanceCheck.missingDistributions
        : balanceCheck.staleAccounts || [];
    const samples = full.slice(0, SAMPLE_LIMIT);
    push(
      'block',
      'stale_balances',
      'Account balances are stale after cash distribution',
      'Update each affected account balance (or record a written override) before treating formal accounting / court exports as current.',
      true,
      samples,
      full.length
    );
  }
  if (auction.notListedCount > 0) {
    const samples = sampleRecords(
      auction.notListed,
      (row) => ({
        id: row.id,
        name: `${row.name || 'Lot'}${row.not_listed_reason ? ` (${row.not_listed_reason})` : ''}`
      })
    );
    push(
      'warn',
      'auction_not_listed',
      'Approved sale/auction lots not on the public catalog',
      `${auction.notListedCount} approved lot(s) are not listed.`,
      false,
      samples,
      auction.notListedCount
    );
  }
  if (expensesMissingReceipt.length) {
    const samples = sampleRecords(expensesMissingReceipt, (row) => ({
      id: row.id,
      name: row.expense_name || row.name || 'Expense'
    }));
    push(
      'block',
      'expense_receipts',
      'Expenses missing receipts',
      `${expensesMissingReceipt.length} expense(s) have no receipt photo or link. Attach proof or record a waiver with reason.`,
      true,
      samples,
      expensesMissingReceipt.length
    );
  }
  if (highRiskMissingPhoto.length) {
    const samples = sampleRecords(highRiskMissingPhoto, (row) => ({
      id: row.id,
      name: row.name || 'Item'
    }));
    push(
      'block',
      'high_value_photos',
      'High-risk items missing photographs',
      `${highRiskMissingPhoto.length} high-value / sale/auction / $500+ item(s) have no photo.`,
      true,
      samples,
      highRiskMissingPhoto.length
    );
  } else if (inventoryMissingPhoto.length > 0) {
    const samples = sampleRecords(inventoryMissingPhoto, (row) => ({
      id: row.id,
      name: row.name || 'Item'
    }));
    push(
      'warn',
      'inventory_photos',
      'Inventory items missing photographs',
      `${inventoryMissingPhoto.length} active item(s) have no photo.`,
      false,
      samples,
      inventoryMissingPhoto.length
    );
  }
  if (!(scenes || []).length) {
    push(
      'block',
      'scene_photos',
      'No scene documentation',
      'Capture dated room/scene photographs before relying on the inventory as condition evidence.'
    );
  }
  if (pendingAckRecipients.length > 0) {
    const samples = pendingAckRecipients.slice(0, SAMPLE_LIMIT);
    push(
      'warn',
      'acknowledgements',
      'Distribution acknowledgements pending',
      `${pendingAckRecipients.length} recipient acknowledgement(s) still pending.`,
      false,
      samples,
      pendingAckRecipients.length
    );
  }
  if (interimCashDistributions.length > 0) {
    const samples = sampleRecords(interimCashDistributions, (row) => ({
      id: row.id,
      name:
        String(row.title || '').trim() ||
        `Cash distribution ${formatEstateDisplayDate(row.distribution_date || row.finalized_at) || ''}`.trim()
    }));
    push(
      'warn',
      'interim_distributions',
      'Cash distributed while claims window open',
      'Document reserve, rationale, and authority for interim distributions before final settlement.',
      false,
      samples,
      interimCashDistributions.length
    );
  }
  if (!familyUpdatePublished) {
    push(
      'warn',
      'family_update',
      'No Family Update published',
      'Publish a numbered Family Update so beneficiaries have staged process disclosure beyond Minimal counts.'
    );
  }
  if (Number(pendingReviewCount) > 0) {
    push(
      'warn',
      'pending_review',
      'Helper review queue not clear',
      `${pendingReviewCount} item(s) still awaiting PR review.`
    );
  }
  if (!settings.inventory_completed_at) {
    push(
      'warn',
      'inventory_complete',
      'Inventory not certified complete',
      'Mark inventory complete when recording is finished.'
    );
  }
  if (!lettersRaw) {
    push(
      'warn',
      'letters',
      'Letters issued date not set',
      'Set Letters issued date — probate countdown and accounting period start from it.'
    );
  }

  const blocking = exceptions.filter((row) => row.severity === 'block' || row.blockFinal);
  const warnings = exceptions.filter((row) => row.severity === 'warn' && !row.blockFinal);
  const filingReady = blocking.length === 0;

  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    filingReady,
    supportingDocsLabel: ESTATE_SUPPORTING_DOCS_LABEL,
    statusLabel: filingReady
      ? 'Supporting record looks complete — review with counsel before filing'
      : 'Supporting record incomplete — gaps below',
    statusDetail: filingReady
      ? `${ESTATE_SUPPORTING_DOCS_LABEL} No blocking completeness gaps. Still reconcile to bank statements and original source documents.`
      : `${blocking.length} blocking gap(s) and ${warnings.length} warning(s). Fix or expressly note them before using this export to prepare filings.`,
    lettersDate: lettersLabel,
    lettersDateRaw: lettersRaw,
    balanceStale: balanceCheck.stale,
    auction: {
      approvedCount: auction.approvedCount,
      listedCount: auction.listedCount,
      notListedCount: auction.notListedCount,
      soldPendingCount: auction.soldPendingCount,
      soldPaidCount: auction.soldPaidCount,
      summaryLabel: auction.summaryLabel,
      balanced: auction.notListedCount === 0 || Boolean(auction.summaryLabel)
    },
    inventory: {
      total: recon.total,
      distributed: recon.distributedCount,
      missingPhotos: inventoryMissingPhoto.length,
      highRiskMissingPhotos: highRiskMissingPhoto.length
    },
    expensesMissingReceipt: expensesMissingReceipt.length,
    sceneCount: (scenes || []).length,
    pendingAcknowledgements: pendingAckRecipients.length,
    exceptions,
    blockingCount: blocking.length,
    warningCount: warnings.length,
    overrideAllowed: true
  };
}

export function completenessConfirmMessage(certificate) {
  const c = certificate || {};
  if (c.filingReady) {
    return `${ESTATE_SUPPORTING_DOCS_LABEL}\n\nCompleteness check passed blocking gaps. Generate this supporting export?`;
  }
  const lines = (c.exceptions || [])
    .filter((row) => row.severity === 'block' || row.blockFinal)
    .slice(0, 6)
    .map((row) => {
      const sample = (row.samples || [])
        .slice(0, 2)
        .map((s) => s.name)
        .join('; ');
      return sample ? `• ${row.label} — ${sample}` : `• ${row.label}`;
    })
    .join('\n');
  return (
    `${ESTATE_SUPPORTING_DOCS_LABEL}\n\n` +
    `Supporting record has gaps.\n\n` +
    `${c.blockingCount || 0} blocking gap(s):\n${lines || '• See completeness certificate'}\n\n` +
    `Generate anyway as a working draft? The export will be labeled “Supporting record incomplete.”`
  );
}

export function formatCompletenessBannerHtml(certificate) {
  const c = certificate || {};
  const color = c.filingReady ? '#166534' : '#9a3412';
  const bg = c.filingReady ? '#f0fdf4' : '#fff7ed';
  const border = c.filingReady ? '#86efac' : '#fdba74';
  const generatedLabel = c.generatedAt
    ? new Date(c.generatedAt).toLocaleString()
    : new Date().toLocaleString();
  const gapHeading = c.filingReady
    ? 'No blocking completeness gaps'
    : `Needs attention (${Number(c.blockingCount || 0) + Number(c.warningCount || 0)} item${
        Number(c.blockingCount || 0) + Number(c.warningCount || 0) === 1 ? '' : 's'
      })`;
  const rows = (c.exceptions || [])
    .slice(0, 12)
    .map((row) => {
      const samples = (row.samples || [])
        .slice(0, 8)
        .map((s) => {
          const idBit = s.id ? ` <span style="opacity:0.75">[${escapeHtml(s.id)}]</span>` : '';
          return `<li style="margin:0.15rem 0">${escapeHtml(s.name)}${idBit}</li>`;
        })
        .join('');
      const total = Number(row.samplesTotal || 0);
      const shown = (row.samples || []).length;
      const more =
        total > shown
          ? `<div style="margin-top:2px;font-size:0.86em;opacity:0.85">+${total - shown} more</div>`
          : '';
      const sampleBlock = samples
        ? `<ul style="margin:4px 0 0;padding-left:16px;font-size:0.86em">${samples}</ul>${more}`
        : '';
      return `<li style="margin-bottom:0.55rem"><strong>${escapeHtml(row.label)}</strong> — ${escapeHtml(row.detail)}${sampleBlock}</li>`;
    })
    .join('');
  return `<div style="border:1px solid ${border};background:${bg};color:${color};padding:12px 14px;margin:12px 0;border-radius:8px">
    <div style="font-size:0.82rem;margin-bottom:8px;opacity:0.95">${escapeHtml(ESTATE_SUPPORTING_DOCS_LABEL)} Supporting documentation — not a court filing.</div>
    <strong>Completeness: ${escapeHtml(c.statusLabel || 'Unknown')}</strong>
    <div style="margin-top:4px;font-size:0.82rem">Generated ${escapeHtml(generatedLabel)}</div>
    <div style="margin-top:6px">${escapeHtml(c.statusDetail || '')}</div>
    <div style="margin-top:8px;font-weight:600">${escapeHtml(gapHeading)}</div>
    ${rows ? `<ul style="margin:8px 0 0;padding-left:18px">${rows}</ul>` : ''}
  </div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Re-export for callers that only need display dates. */
export { formatEstateDisplayDate, parseEstateLocalDate };
