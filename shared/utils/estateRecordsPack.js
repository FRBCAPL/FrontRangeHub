/**
 * Build a USB-ready ZIP of estate administration records (HTML/JSON).
 * Orchestrates existing generators — no new report engines.
 */

import JSZip from 'jszip';
import estateInventoryService from '../services/estateInventoryService.js';
import { buildCourtPackHtml } from './estateCourtPack.js';
import { buildFormalAccountingHtml } from './estateFormalAccounting.js';
import { buildAdministrationChronologyHtml } from './estateAdministrationChronology.js';
import {
  buildInventoryReconciliation,
  buildInventoryReconciliationHtml
} from './estateInventoryReconciliation.js';
import {
  buildAuctionReconciliation,
  buildAuctionReconciliationHtml
} from './estateAuctionReconciliation.js';
import { buildGiftResidualScheduleHtml } from './estateGiftResidualSchedule.js';
import { buildFamilyUpdateHtml } from './estateFamilyUpdate.js';
import {
  buildPrintableCatalogHtml,
  buildCatalogJson
} from './estateExport.js';
import { formatCompletenessBannerHtml } from './estateCompleteness.js';
import { saleAuctionCopy } from './estateSaleAuctionCopy.js';
import { bundleCatalogPhotos } from './estateRecordsPackPhotos.js';
import {
  appendFullDocumentationSections,
  prepareExpenseReceiptBundle
} from './estateRecordsPackFullDocs.js';
import {
  applyOfflineExpenseReceiptUrls,
  rewriteExpenseUrlsInHtml
} from './estateRecordsPackOfflineUrls.js';

function safeFilePart(value) {
  return (
    String(value || 'estate')
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'estate'
  );
}

function yyyymmdd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function requireOk(result, label) {
  if (!result?.success) {
    throw new Error(result?.error || `${label} failed.`);
  }
  return result.data;
}

async function downloadPhotoForPack(url) {
  const result = await estateInventoryService.downloadEstatePhotoBlob(url);
  if (!result?.success || !result.data) {
    throw new Error(result?.error || 'photo download failed');
  }
  return result.data;
}

/**
 * @param {object} opts
 * @param {string} opts.caseNumber
 * @param {string} [opts.displayCaseNumber]
 * @param {(label: string) => void} [opts.onProgress]
 * @returns {Promise<{ success: true, folderName: string, omitted: string[] } | { success: false, error: string }>}
 */
export async function buildAndDownloadRecordsPack({
  caseNumber,
  displayCaseNumber = null,
  onProgress
} = {}) {
  const omitted = [];
  const included = [];
  const progress = (label) => {
    try {
      onProgress?.(label);
    } catch {
      /* ignore */
    }
  };

  try {
    if (!caseNumber) {
      return { success: false, error: 'Case number is required.' };
    }

    const caseLabel = displayCaseNumber || caseNumber || 'estate';
    const generatedAt = new Date();
    const generatedIso = generatedAt.toISOString();
    const folderName = `estate-records-${safeFilePart(caseLabel)}-${yyyymmdd(generatedAt)}`;
    const zip = new JSZip();
    const folder = zip.folder(folderName);

    progress('Loading estate settings…');
    const settingsResult = await estateInventoryService.getSettings(caseNumber);
    const settings = settingsResult.success ? settingsResult.data || {} : {};
    const estateName = settings.estate_name || 'Estate';

    // ——— Required ———
    // Bundle expense receipts first so evidence + formal accounting HTML can
    // link to local 14-expense-receipts/ paths (RP-02).
    const expenseBundle = await prepareExpenseReceiptBundle({
      service: estateInventoryService,
      caseNumber,
      downloadPhoto: downloadPhotoForPack,
      progress
    });
    if (!expenseBundle.success && expenseBundle.error) {
      omitted.push(`14-expense-receipts — ${expenseBundle.error}`);
    }

    progress('Building evidence pack…');
    const courtPackRaw = await requireOk(
      await estateInventoryService.buildCourtEvidencePack(caseNumber),
      'Evidence pack'
    );
    const courtPack = applyOfflineExpenseReceiptUrls(
      courtPackRaw,
      expenseBundle.urlToLocal
    );
    const courtHtml = rewriteExpenseUrlsInHtml(
      buildCourtPackHtml(courtPack),
      expenseBundle.urlToLocal
    );
    folder.file('01-evidence-pack.html', courtHtml);
    folder.file('01-evidence-pack.json', JSON.stringify(courtPack, null, 2));
    included.push('01-evidence-pack.html', '01-evidence-pack.json');

    progress('Building formal accounting…');
    const accountingRaw = await requireOk(
      await estateInventoryService.getFormalAccountingStatement(caseNumber),
      'Formal accounting'
    );
    const accounting = applyOfflineExpenseReceiptUrls(
      accountingRaw,
      expenseBundle.urlToLocal
    );
    const accountingHtml = rewriteExpenseUrlsInHtml(
      buildFormalAccountingHtml(accounting),
      expenseBundle.urlToLocal
    );
    folder.file('02-formal-accounting.html', accountingHtml);
    included.push('02-formal-accounting.html');

    progress('Building administration chronology…');
    const chronology = await requireOk(
      await estateInventoryService.getAdministrationChronologyExport(caseNumber),
      'Administration chronology'
    );
    folder.file(
      '03-administration-chronology.html',
      buildAdministrationChronologyHtml(chronology)
    );
    included.push('03-administration-chronology.html');

    progress('Building completeness certificate…');
    const certificate = await requireOk(
      await estateInventoryService.getCompletenessCertificate(caseNumber),
      'Completeness certificate'
    );
    // Written last (09) after optional reports so ZIP listing stays numbered.

    // ——— Optional (omit + note in README on failure) ———
    progress('Building inventory reconciliation…');
    try {
      const catalogResult = await estateInventoryService.listAllItemsWithRooms(caseNumber);
      if (!catalogResult.success) {
        throw new Error(catalogResult.error || 'Could not load catalog.');
      }
      const items = catalogResult.data || [];
      const reconHtml = buildInventoryReconciliationHtml({
        reconciliation: buildInventoryReconciliation(items),
        estateName,
        caseNumber: caseLabel
      });
      folder.file('04-inventory-reconciliation.html', reconHtml);
      included.push('04-inventory-reconciliation.html');

      progress('Bundling catalog photos…');
      const photoBundle = await bundleCatalogPhotos(items, downloadPhotoForPack, progress);
      for (const file of photoBundle.files) {
        folder.file(file.path, file.blob);
      }
      if (photoBundle.files.length) {
        included.push(`photos/ (${photoBundle.files.length} file(s))`);
      }
      for (const line of photoBundle.failed) {
        omitted.push(`photo — ${line}`);
      }

      progress('Building inventory catalog…');
      const catalogHtml = buildPrintableCatalogHtml({
        caseNumber: caseNumber || caseLabel,
        items: photoBundle.rewrittenItems,
        generatedAt: generatedAt.toLocaleString(),
        certificateHtml: formatCompletenessBannerHtml(certificate),
        offlinePack: true
      });
      folder.file('08-inventory-catalog.html', catalogHtml);
      folder.file(
        '08-inventory-catalog.json',
        buildCatalogJson({
          caseNumber: caseNumber || caseLabel,
          items: photoBundle.rewrittenItems,
          generatedAt: generatedIso,
          offlinePack: true
        })
      );
      included.push('08-inventory-catalog.html', '08-inventory-catalog.json');
    } catch (err) {
      omitted.push(
        `04-inventory-reconciliation.html — ${err?.message || 'failed'}`
      );
      omitted.push(`08-inventory-catalog.html / .json — ${err?.message || 'failed'}`);
    }

    progress(`Building ${saleAuctionCopy.reconciliation.toLowerCase()}…`);
    try {
      const auctionResult = await estateInventoryService.listFinanceAuctionItems(caseNumber);
      if (!auctionResult.success) {
        throw new Error(auctionResult.error || 'Could not load sale inventory lots.');
      }
      const report = buildAuctionReconciliation({
        paid: auctionResult.data?.paid || [],
        outstanding: auctionResult.data?.outstanding || [],
        unsold: auctionResult.data?.unsold || [],
        estateName,
        caseNumber: caseLabel
      });
      folder.file(
        '05-sale-inventory-reconciliation.html',
        buildAuctionReconciliationHtml(report)
      );
      included.push('05-sale-inventory-reconciliation.html');
    } catch (err) {
      omitted.push(
        `05-sale-inventory-reconciliation.html — ${err?.message || 'failed'}`
      );
    }

    progress('Building gift & residual schedule…');
    try {
      const gift = await requireOk(
        await estateInventoryService.getGiftResidualScheduleExport(caseNumber),
        'Gift & residual schedule'
      );
      folder.file('06-gift-residual-schedule.html', buildGiftResidualScheduleHtml(gift));
      included.push('06-gift-residual-schedule.html');
    } catch (err) {
      omitted.push(`06-gift-residual-schedule.html — ${err?.message || 'failed'}`);
    }

    progress('Building family update…');
    try {
      const family = await requireOk(
        await estateInventoryService.getFamilyUpdatePackage(caseNumber),
        'Family Update'
      );
      folder.file('07-family-update.html', buildFamilyUpdateHtml(family));
      included.push('07-family-update.html');
    } catch (err) {
      omitted.push(`07-family-update.html — ${err?.message || 'failed'}`);
    }

    folder.file('09-completeness-certificate.json', JSON.stringify(certificate, null, 2));
    included.push('09-completeness-certificate.json');

    await appendFullDocumentationSections({
      service: estateInventoryService,
      folder,
      caseNumber,
      caseLabel,
      estateName,
      generatedAt,
      generatedIso,
      progress,
      omitted,
      included,
      downloadPhoto: downloadPhotoForPack,
      expenseBundle
    });

    const sortedIncluded = [
      'README.txt',
      ...included.filter((f) => f !== 'README.txt').sort((a, b) => {
        const na = parseInt(String(a).slice(0, 2), 10);
        const nb = parseInt(String(b).slice(0, 2), 10);
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        if (String(a).startsWith('photos/')) return 1;
        if (String(b).startsWith('photos/')) return -1;
        return String(a).localeCompare(String(b));
      })
    ];

    const readme = [
      'Estate Vault — Full documentation records pack',
      '==============================================',
      '',
      `Estate: ${estateName}`,
      `Case: ${caseLabel}`,
      `Generated: ${generatedIso}`,
      '',
      'These files are supporting estate administration records.',
      'They are NOT a court filing. Review with counsel before use.',
      '',
      'Save this ZIP to a USB drive and keep a second copy.',
      '',
      'Contents overview:',
      '  01–09  Court-supporting reports, catalog, completeness certificate',
      '  photos/  Inventory item photos (relative paths in catalog)',
      '  10      Decision / explanation notes (HTML + JSON)',
      '  11      Distribution receipts (HTML + PDF per recipient)',
      '  12      Scene captures (index + local photos)',
      '  13      Account statement originals (PDF/images)',
      '  14      Expense receipt photos',
      '',
      'Offline notes:',
      '  - Keep this folder intact so relative media paths keep working.',
      '  - Evidence pack and formal accounting receipt links point at',
      '    14-expense-receipts/ (local files), not cloud URLs.',
      '  - Open HTML files in a browser without needing an internet connection',
      '    for bundled photos and statements.',
      '',
      'Included files:',
      ...sortedIncluded.filter((f) => f !== 'README.txt').map((f) => `  - ${f}`),
      '',
      ...(omitted.length
        ? [
            'Omitted / failed (optional):',
            ...omitted.map((line) => `  - ${line}`),
            ''
          ]
        : []),
      'Generated from Reports → Download records pack (full documentation).'
    ].join('\n');

    folder.file('README.txt', readme);

    progress('Assembling ZIP…');
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    downloadBlob(blob, `${folderName}.zip`);

    return { success: true, folderName, omitted };
  } catch (err) {
    return {
      success: false,
      error: err?.message || 'Could not build records pack.'
    };
  }
}

export default {
  buildAndDownloadRecordsPack
};
