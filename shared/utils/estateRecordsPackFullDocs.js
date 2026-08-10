/**
 * Full-documentation sections (10–14) for the records pack ZIP.
 */

import {
  buildDecisionNotesHtml,
  buildDecisionNotesJson
} from './estateDecisionNotesExport.js';
import {
  buildSceneCapturesHtml,
  buildSceneCapturesJson
} from './estateSceneCapturesExport.js';
import { bundleRowPhotos } from './estateRecordsPackBinaries.js';
import {
  finalizedDistributions,
  buildDistributionReceiptHtml,
  buildDistributionReceiptPdfLines
} from './estateDistributionReceipt.js';
import { buildSimpleTextPdf } from './estateSimplePdf.js';
import { distributionClassificationLabel } from './estateInventoryConstants.js';

function safeFilePart(value, fallback = 'file') {
  return (
    String(value || fallback)
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || fallback
  );
}

async function downloadFinanceDoc(service, storagePath) {
  const result = await service.downloadEstateFinanceDocumentBlob(storagePath);
  if (!result?.success || !result.data) {
    throw new Error(result?.error || 'finance document download failed');
  }
  return result.data;
}

/**
 * Append decision notes, distribution receipts, scenes, statements, expense receipts.
 */
export async function appendFullDocumentationSections({
  service,
  folder,
  caseNumber,
  caseLabel,
  estateName,
  generatedAt,
  generatedIso,
  progress,
  omitted,
  included,
  downloadPhoto
}) {
  // ——— 10 Decision notes ———
  progress('Building decision notes…');
  try {
    const notesResult = await service.listDecisionNotes(caseNumber, 500);
    if (!notesResult.success) {
      throw new Error(notesResult.error || 'Could not load decision notes.');
    }
    const notes = notesResult.data || [];
    folder.file(
      '10-decision-notes.html',
      buildDecisionNotesHtml({
        caseNumber: caseLabel,
        estateName,
        notes,
        generatedAt: generatedAt.toLocaleString()
      })
    );
    folder.file(
      '10-decision-notes.json',
      buildDecisionNotesJson({
        caseNumber: caseLabel,
        estateName,
        notes,
        generatedAt: generatedIso
      })
    );
    included.push('10-decision-notes.html', '10-decision-notes.json');
  } catch (err) {
    omitted.push(`10-decision-notes — ${err?.message || 'failed'}`);
  }

  // ——— 11 Distribution receipts ———
  progress('Building distribution receipts…');
  try {
    const distResult = await service.listEstateDistributions(caseNumber);
    if (!distResult.success) {
      throw new Error(distResult.error || 'Could not load distributions.');
    }
    const batches = finalizedDistributions(distResult.data || []);
    const receiptIndex = [];
    let receiptCount = 0;
    for (const distribution of batches) {
      const recipients = distribution.recipients || [];
      for (const recipient of recipients) {
        const base = `${safeFilePart(distribution.distribution_date, 'date')}_${safeFilePart(
          recipient.recipient_name,
          'recipient'
        )}_${safeFilePart(recipient.id || String(receiptCount), 'r')}`;
        const input = {
          distribution: {
            ...distribution,
            classificationLabel: distributionClassificationLabel(distribution.classification)
          },
          recipient,
          estateName,
          caseNumber: caseLabel
        };
        const htmlPath = `11-distribution-receipts/${base}.html`;
        const pdfPath = `11-distribution-receipts/${base}.pdf`;
        folder.file(htmlPath, buildDistributionReceiptHtml(input));
        const pdfBytes = buildSimpleTextPdf(buildDistributionReceiptPdfLines(input), {
          fontSize: 11,
          maxChars: 92
        });
        folder.file(pdfPath, pdfBytes);
        receiptIndex.push({
          distribution_id: distribution.id,
          recipient_id: recipient.id,
          recipient_name: recipient.recipient_name,
          distribution_date: distribution.distribution_date,
          html: htmlPath.replace('11-distribution-receipts/', ''),
          pdf: pdfPath.replace('11-distribution-receipts/', '')
        });
        receiptCount += 1;
      }
    }
    folder.file(
      '11-distribution-receipts/index.json',
      JSON.stringify(
        {
          export_kind: 'distribution_receipts',
          estate_name: estateName,
          case_number: caseLabel,
          generated_at: generatedIso,
          receipt_count: receiptCount,
          receipts: receiptIndex
        },
        null,
        2
      )
    );
    included.push(`11-distribution-receipts/ (${receiptCount} receipt(s))`);
  } catch (err) {
    omitted.push(`11-distribution-receipts — ${err?.message || 'failed'}`);
  }

  // ——— 12 Scene captures ———
  progress('Bundling scene captures…');
  try {
    const scenesResult = await service.listSceneCaptures(caseNumber, {
      includeArchived: true
    });
    if (!scenesResult.success) {
      throw new Error(scenesResult.error || 'Could not load scene captures.');
    }
    const scenes = scenesResult.data || [];
    const bundled = await bundleRowPhotos(scenes, {
      folderPrefix: '12-scene-captures',
      downloadBlob: downloadPhoto,
      onProgress: progress,
      progressLabel: 'Bundling scene photo',
      kind: 'scene'
    });
    for (const file of bundled.files) {
      folder.file(file.path, file.blob);
    }
    for (const line of bundled.failed) {
      omitted.push(`scene photo — ${line}`);
    }
    folder.file(
      '12-scene-captures/index.html',
      buildSceneCapturesHtml({
        caseNumber: caseLabel,
        estateName,
        scenes: bundled.rewritten,
        generatedAt: generatedAt.toLocaleString()
      })
    );
    folder.file(
      '12-scene-captures/index.json',
      buildSceneCapturesJson({
        caseNumber: caseLabel,
        estateName,
        scenes: bundled.rewritten,
        generatedAt: generatedIso
      })
    );
    included.push(
      `12-scene-captures/ (${scenes.length} scene(s), ${bundled.files.length} photo(s))`
    );
  } catch (err) {
    omitted.push(`12-scene-captures — ${err?.message || 'failed'}`);
  }

  // ——— 13 Account statements ———
  progress('Bundling account statements…');
  try {
    const [docsResult, accountsResult] = await Promise.all([
      service.listAllEstateAccountDocuments(caseNumber),
      service.listEstateAccounts(caseNumber)
    ]);
    if (!docsResult.success) {
      throw new Error(docsResult.error || 'Could not load account documents.');
    }
    const accounts = accountsResult.success ? accountsResult.data || [] : [];
    const accountNameById = new Map(
      accounts.map((a) => [a.id, a.name || a.account_name || a.label || a.id])
    );
    const docs = docsResult.data || [];
    const indexRows = [];
    let saved = 0;
    for (let i = 0; i < docs.length; i += 1) {
      const doc = docs[i];
      progress(`Bundling statement ${i + 1} of ${docs.length}…`);
      const accountId = doc.account_id || 'account';
      const fileName =
        safeFilePart(doc.file_name || `statement-${doc.id}`, 'statement') || 'statement';
      const relative = `${safeFilePart(accountId)}/${fileName}`;
      try {
        if (!doc.storage_path) throw new Error('missing storage_path');
        const blob = await downloadFinanceDoc(service, doc.storage_path);
        folder.file(`13-account-statements/${relative}`, blob);
        saved += 1;
        indexRows.push({
          id: doc.id,
          account_id: doc.account_id,
          account_name: accountNameById.get(doc.account_id) || null,
          file_name: doc.file_name,
          relative_path: relative,
          mime_type: doc.mime_type,
          size_bytes: doc.size_bytes,
          sha256_hash: doc.sha256_hash,
          statement_date: doc.statement_date,
          notes: doc.notes || null
        });
      } catch (err) {
        omitted.push(
          `account statement ${doc.file_name || doc.id} — ${err?.message || 'failed'}`
        );
        indexRows.push({
          id: doc.id,
          account_id: doc.account_id,
          file_name: doc.file_name,
          omitted: true,
          error: err?.message || 'failed'
        });
      }
    }
    folder.file(
      '13-account-statements/index.json',
      JSON.stringify(
        {
          export_kind: 'account_statements',
          estate_name: estateName,
          case_number: caseLabel,
          generated_at: generatedIso,
          document_count: docs.length,
          bundled_count: saved,
          documents: indexRows
        },
        null,
        2
      )
    );
    included.push(`13-account-statements/ (${saved} of ${docs.length} file(s))`);
  } catch (err) {
    omitted.push(`13-account-statements — ${err?.message || 'failed'}`);
  }

  // ——— 14 Expense receipts ———
  progress('Bundling expense receipts…');
  try {
    const expensesResult = await service.listEstateExpenses(caseNumber);
    if (!expensesResult.success) {
      throw new Error(expensesResult.error || 'Could not load expenses.');
    }
    const expenses = expensesResult.data || [];
    const withReceipts = expenses.filter((e) => e.receipt_url);
    const bundled = await bundleRowPhotos(withReceipts, {
      folderPrefix: '14-expense-receipts',
      downloadBlob: downloadPhoto,
      onProgress: progress,
      progressLabel: 'Bundling expense receipt',
      kind: 'expense'
    });
    for (const file of bundled.files) {
      folder.file(file.path, file.blob);
    }
    for (const line of bundled.failed) {
      omitted.push(`expense receipt — ${line}`);
    }
    const index = bundled.rewritten.map((row) => ({
      id: row.id,
      expense_name: row.expense_name,
      amount: row.amount,
      date_paid: row.date_paid,
      receipt_file: row.receipt_url || null,
      remote_receipt_url: row.remote_receipt_url || null,
      offline_missing: Boolean(row.offline_missing)
    }));
    folder.file(
      '14-expense-receipts/index.json',
      JSON.stringify(
        {
          export_kind: 'expense_receipts',
          estate_name: estateName,
          case_number: caseLabel,
          generated_at: generatedIso,
          expense_count: expenses.length,
          receipt_count: bundled.files.length,
          receipts: index
        },
        null,
        2
      )
    );
    included.push(
      `14-expense-receipts/ (${bundled.files.length} of ${withReceipts.length} receipt(s))`
    );
  } catch (err) {
    omitted.push(`14-expense-receipts — ${err?.message || 'failed'}`);
  }
}

export default { appendFullDocumentationSections };
