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
    progress('Building evidence pack…');
    const courtPack = await requireOk(
      await estateInventoryService.buildCourtEvidencePack(caseNumber),
      'Evidence pack'
    );
    folder.file('01-evidence-pack.html', buildCourtPackHtml(courtPack));
    folder.file('01-evidence-pack.json', JSON.stringify(courtPack, null, 2));
    included.push('01-evidence-pack.html', '01-evidence-pack.json');

    progress('Building formal accounting…');
    const accounting = await requireOk(
      await estateInventoryService.getFormalAccountingStatement(caseNumber),
      'Formal accounting'
    );
    folder.file('02-formal-accounting.html', buildFormalAccountingHtml(accounting));
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
    folder.file('09-completeness-certificate.json', JSON.stringify(certificate, null, 2));
    included.push('09-completeness-certificate.json');

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

      progress('Building inventory catalog…');
      const catalogHtml = buildPrintableCatalogHtml({
        caseNumber: caseNumber || caseLabel,
        items,
        generatedAt: generatedAt.toLocaleString(),
        certificateHtml: formatCompletenessBannerHtml(certificate)
      });
      folder.file('08-inventory-catalog.html', catalogHtml);
      folder.file(
        '08-inventory-catalog.json',
        buildCatalogJson({
          caseNumber: caseNumber || caseLabel,
          items,
          generatedAt: generatedIso
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

    const readme = [
      'Estate Vault — Records Pack',
      '===========================',
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
      'Included files:',
      ...included.map((f) => `  - ${f}`),
      '',
      ...(omitted.length
        ? [
            'Omitted (optional report failed):',
            ...omitted.map((line) => `  - ${line}`),
            ''
          ]
        : []),
      'Folder layout matches the Download records pack export from Reports.'
    ].join('\n');

    folder.file('README.txt', readme);
    included.unshift('README.txt');

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
