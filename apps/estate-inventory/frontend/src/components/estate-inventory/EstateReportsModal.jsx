import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  openPrintablePdfCatalog,
  downloadJsonFile
} from '@shared/utils/estateExport.js';
import {
  downloadCourtPackJson,
  writeCourtPackWindow
} from '@shared/utils/estateCourtPack.js';
import { openFormalAccountingStatement } from '@shared/utils/estateFormalAccounting.js';
import {
  buildAuctionReconciliation,
  openAuctionReconciliation
} from '@shared/utils/estateAuctionReconciliation.js';
import {
  openInventoryReconciliation,
  buildInventoryReconciliation
} from '@shared/utils/estateInventoryReconciliation.js';
import {
  downloadFamilyUpdate,
  openFamilyUpdate
} from '@shared/utils/estateFamilyUpdate.js';
import {
  completenessConfirmMessage,
  formatCompletenessBannerHtml
} from '@shared/utils/estateCompleteness.js';
import {
  openAdministrationChronology
} from '@shared/utils/estateAdministrationChronology.js';
import {
  openGiftResidualSchedule
} from '@shared/utils/estateGiftResidualSchedule.js';
import EstateDecisionNotesModal from './EstateDecisionNotesModal.jsx';

/**
 * Admin reports: court evidence pack, printable PDF, read-only share link, and
 * JSON backup. Controlled by the parent so the trigger can live in the nav —
 * the nav uses backdrop-filter, which would trap a fixed-position modal.
 */
const EstateReportsModal = ({
  open,
  onClose,
  caseNumber,
  displayCaseNumber = null,
  onMessage
}) => {
  const [busy, setBusy] = useState(false);
  const [showDecisionNotes, setShowDecisionNotes] = useState(false);
  const caseLabel = displayCaseNumber || caseNumber || 'estate';

  const loadCatalog = async () => {
    const result = await estateInventoryService.listAllItemsWithRooms(caseNumber);
    if (!result.success) {
      onMessage?.(result.error || 'Could not load catalog.');
      return null;
    }
    return result.data;
  };

  const confirmCompleteness = async () => {
    const result = await estateInventoryService.getCompletenessCertificate(caseNumber);
    if (!result.success) {
      onMessage?.(result.error || 'Could not run completeness check.');
      return false;
    }
    return window.confirm(completenessConfirmMessage(result.data));
  };

  const handleCourtPack = async () => {
    setBusy(true);
    const allowed = await confirmCompleteness();
    if (!allowed) {
      setBusy(false);
      onMessage?.('Court pack cancelled — resolve completeness exceptions or confirm a draft export.');
      return;
    }
    // Open synchronously so browsers do not block the printable window after
    // the asynchronous evidence queries finish.
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<!doctype html><title>Preparing court pack…</title><p style="font-family:system-ui;padding:2rem">Preparing court evidence pack…</p>'
      );
    }
    const result = await estateInventoryService.buildCourtEvidencePack(caseNumber);
    setBusy(false);
    if (!result.success) {
      printWindow?.close();
      onMessage?.(result.error || 'Could not build court pack.');
      return;
    }
    downloadCourtPackJson(result.data);
    const opened = writeCourtPackWindow(printWindow, result.data);
    if (!opened.success) onMessage?.(opened.error);
    else {
      const ready = result.data.filing_ready;
      onMessage?.(
        ready
          ? 'Court evidence pack opened and sealed JSON saved. Still reconcile to bank statements before filing.'
          : `Working draft evidence pack saved — supporting record incomplete (${result.data.completeness?.blockingCount || 0} blocking gap(s)).`
      );
    }
  };

  const handleFormalAccounting = async () => {
    setBusy(true);
    const allowed = await confirmCompleteness();
    if (!allowed) {
      setBusy(false);
      onMessage?.('Formal accounting cancelled.');
      return;
    }
    const result = await estateInventoryService.getFormalAccountingStatement(caseNumber);
    setBusy(false);
    if (!result.success) {
      onMessage?.(result.error || 'Could not build formal accounting.');
      return;
    }
    const opened = openFormalAccountingStatement(result.data);
    if (!opened.success) onMessage?.(opened.error);
    else {
      onMessage?.(
        result.data.completeness?.filingReady
          ? 'Formal accounting opened — supporting schedule. Review with counsel before filing.'
          : 'Formal accounting opened as a working draft (supporting record incomplete).'
      );
    }
  };

  const handleAuctionReconciliation = async () => {
    setBusy(true);
    const [settingsResult, auctionResult] = await Promise.all([
      estateInventoryService.getSettings(caseNumber),
      estateInventoryService.listFinanceAuctionItems(caseNumber)
    ]);
    setBusy(false);
    if (!auctionResult.success) {
      onMessage?.(auctionResult.error || 'Could not load auction lots.');
      return;
    }
    const report = buildAuctionReconciliation({
      paid: auctionResult.data?.paid || [],
      outstanding: auctionResult.data?.outstanding || [],
      unsold: auctionResult.data?.unsold || [],
      estateName: settingsResult.data?.estate_name || 'Estate',
      caseNumber: caseLabel
    });
    const opened = openAuctionReconciliation(report);
    if (!opened.success) onMessage?.(opened.error);
    else onMessage?.('Sale/auction reconciliation opened — use Print / Save as PDF.');
  };

  const handleInventoryReconciliation = async () => {
    setBusy(true);
    const [settingsResult, items] = await Promise.all([
      estateInventoryService.getSettings(caseNumber),
      loadCatalog()
    ]);
    setBusy(false);
    if (!items) return;
    const opened = openInventoryReconciliation({
      reconciliation: buildInventoryReconciliation(items),
      estateName: settingsResult.data?.estate_name || 'Estate',
      caseNumber: caseLabel
    });
    if (!opened.success) onMessage?.(opened.error);
    else onMessage?.('Inventory reconciliation opened — use Print / Save as PDF.');
  };

  const handleFamilyUpdate = async () => {
    setBusy(true);
    const result = await estateInventoryService.getFamilyUpdatePackage(caseNumber);
    setBusy(false);
    if (!result.success) {
      onMessage?.(result.error || 'Could not build Family Update.');
      return;
    }
    const downloaded = downloadFamilyUpdate(result.data);
    if (!downloaded.success) {
      const opened = openFamilyUpdate(result.data);
      if (!opened.success) onMessage?.(opened.error || downloaded.error);
      else onMessage?.('Family Update preview opened — use Print / Save as PDF.');
      return;
    }
    onMessage?.('Family Update preview downloaded. Use Publish to share it with heirs.');
  };

  const handlePublishFamilyUpdate = async () => {
    const note =
      window.prompt(
        'Optional note for beneficiaries (appears with this Family Update):',
        ''
      ) ?? null;
    if (note === null) return;
    setBusy(true);
    const result = await estateInventoryService.publishFamilyUpdate({
      caseNumber,
      prNote: note
    });
    setBusy(false);
    if (!result.success) {
      onMessage?.(result.error || 'Could not publish Family Update.');
      return;
    }
    downloadFamilyUpdate({
      ...result.data.package,
      updateNumber: result.data.update_number
    });
    onMessage?.(
      `Published Family Update #${result.data.update_number}. Beneficiaries can read it in the family portal.`
    );
  };

  const handleChronology = async () => {
    setBusy(true);
    const result = await estateInventoryService.getAdministrationChronologyExport(caseNumber);
    setBusy(false);
    if (!result.success) {
      onMessage?.(result.error || 'Could not build chronology.');
      return;
    }
    openAdministrationChronology(result.data);
    onMessage?.('Administration chronology opened (supporting timeline).');
  };

  const handleGiftResidual = async () => {
    setBusy(true);
    const result = await estateInventoryService.getGiftResidualScheduleExport(caseNumber);
    setBusy(false);
    if (!result.success) {
      onMessage?.(result.error || 'Could not build gift & residual schedule.');
      return;
    }
    openGiftResidualSchedule(result.data);
    onMessage?.('Gift & residual schedule opened (supporting documentation).');
  };

  const handlePdf = async () => {
    setBusy(true);
    const [items, certResult] = await Promise.all([
      loadCatalog(),
      estateInventoryService.getCompletenessCertificate(caseNumber)
    ]);
    setBusy(false);
    if (!items) return;
    if (certResult.success && !window.confirm(completenessConfirmMessage(certResult.data))) {
      onMessage?.('Catalog export cancelled.');
      return;
    }
    const result = openPrintablePdfCatalog({
      caseNumber: caseNumber || caseLabel,
      items,
      generatedAt: new Date().toLocaleString(),
      certificateHtml: certResult.success
        ? formatCompletenessBannerHtml(certResult.data)
        : ''
    });
    if (!result.success) onMessage?.(result.error);
    else onMessage?.('Catalog opened — working export, not a filing certificate. Use Print / Save as PDF.');
  };

  const handleJson = async () => {
    setBusy(true);
    const items = await loadCatalog();
    setBusy(false);
    if (!items) return;
    downloadJsonFile({
      caseNumber: caseNumber || caseLabel,
      items,
      generatedAt: new Date().toISOString()
    });
    onMessage?.('JSON catalog downloaded.');
  };

  const handleShare = async () => {
    setBusy(true);
    const result = await estateInventoryService.createReadOnlyShareLink(caseNumber);
    setBusy(false);
    if (!result.success) {
      onMessage?.(result.error || 'Could not create share link.');
      return;
    }
    const url = result.data?.publicUrl;
    if (url && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        onMessage?.(`Read-only link copied: ${url}`);
        return;
      } catch {
        // fall through
      }
    }
    onMessage?.(url ? `Read-only link: ${url}` : 'Share link created.');
  };

  if (!open) return null;

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings ei-reports-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-reports-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <div>
            <h3 id="ei-reports-title">Reports</h3>
            <p className="ei-settings-hint" style={{ margin: '0.2rem 0 0' }}>
              Case {caseLabel} · Estate administration records and court-supporting
              reports. Review with counsel before filing.
            </p>
          </div>
          <button
            type="button"
            className="ei-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          <div className="ei-reports-actions">
            <button
              type="button"
              className="ei-action ei-action-primary"
              disabled={busy}
              onClick={handleCourtPack}
            >
              <span className="ei-action-label">Evidence pack (supporting)</span>
              <span className="ei-action-hint">
                Sealed binder + JSON for your records. Completeness check runs first; gaps stay
                visible on the export
              </span>
            </button>
            <button
              type="button"
              className="ei-action"
              disabled={busy}
              onClick={handleFamilyUpdate}
            >
              <span className="ei-action-label">Preview Family Update</span>
              <span className="ei-action-hint">
                Download a beneficiary package now (timeline, inventory, auction, next steps)
              </span>
            </button>
            <button
              type="button"
              className="ei-action ei-action-primary"
              disabled={busy}
              onClick={handlePublishFamilyUpdate}
            >
              <span className="ei-action-label">Publish Family Update</span>
              <span className="ei-action-hint">
                Numbered report heirs can open in the family portal (also downloads a copy)
              </span>
            </button>
            <button
              type="button"
              className="ei-action"
              disabled={busy}
              onClick={handleFormalAccounting}
            >
              <span className="ei-action-label">Formal accounting</span>
              <span className="ei-action-hint">
                Period statement with completeness gaps called out — supporting doc, not a filing
              </span>
            </button>
            <button
              type="button"
              className="ei-action"
              disabled={busy}
              onClick={handleAuctionReconciliation}
            >
              <span className="ei-action-label">Sale/auction reconciliation</span>
              <span className="ei-action-hint">
                Sold, pending, and unsold lots with collected vs outstanding proceeds
              </span>
            </button>
            <button
              type="button"
              className="ei-action"
              disabled={busy}
              onClick={handleInventoryReconciliation}
            >
              <span className="ei-action-label">Inventory reconciliation</span>
              <span className="ei-action-hint">
                Every item in exactly one disposition — catch auction lot mismatches
              </span>
            </button>
            <button
              type="button"
              className="ei-action"
              disabled={busy}
              onClick={handleChronology}
            >
              <span className="ei-action-label">Administration chronology</span>
              <span className="ei-action-hint">
                Supporting timeline from Letters, distributions, Family Updates, and activity
              </span>
            </button>
            <button
              type="button"
              className="ei-action"
              disabled={busy}
              onClick={handleGiftResidual}
            >
              <span className="ei-action-label">Gift &amp; residual schedule</span>
              <span className="ei-action-hint">
                Memorandum gifts + residual sketch from live finance (counsel review aid)
              </span>
            </button>
            <button
              type="button"
              className="ei-action"
              disabled={busy}
              onClick={() => setShowDecisionNotes(true)}
            >
              <span className="ei-action-label">Decision / explanation notes</span>
              <span className="ei-action-hint">
                Record why overrides, disputes, or interim distributions were handled this way
              </span>
            </button>
            <button type="button" className="ei-action" disabled={busy} onClick={handlePdf}>
              <span className="ei-action-label">Inventory catalog PDF</span>
              <span className="ei-action-hint">
                Printable supporting catalog with completeness status
              </span>
            </button>
            <button type="button" className="ei-action" disabled={busy} onClick={handleShare}>
              <span className="ei-action-label">Share read-only</span>
              <span className="ei-action-hint">
                Copy a frozen public inventory link (point-in-time snapshot)
              </span>
            </button>
            <button type="button" className="ei-action" disabled={busy} onClick={handleJson}>
              <span className="ei-action-label">Download JSON</span>
              <span className="ei-action-hint">Machine-readable catalog backup</span>
            </button>
          </div>
          {busy ? <p className="ei-status" style={{ marginTop: '0.75rem' }}>Working…</p> : null}
        </div>
        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <EstateDecisionNotesModal
        open={showDecisionNotes}
        onClose={() => setShowDecisionNotes(false)}
        caseNumber={caseNumber}
        onMessage={onMessage}
      />
    </div>
  );
};

export default EstateReportsModal;
