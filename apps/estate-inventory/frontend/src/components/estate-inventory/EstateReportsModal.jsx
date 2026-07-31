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
  const caseLabel = displayCaseNumber || caseNumber || 'estate';

  const loadCatalog = async () => {
    const result = await estateInventoryService.listAllItemsWithRooms(caseNumber);
    if (!result.success) {
      onMessage?.(result.error || 'Could not load catalog.');
      return null;
    }
    return result.data;
  };

  const handleCourtPack = async () => {
    // Open synchronously so browsers do not block the printable window after
    // the asynchronous evidence queries finish.
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<!doctype html><title>Preparing court pack…</title><p style="font-family:system-ui;padding:2rem">Preparing court evidence pack…</p>'
      );
    }
    setBusy(true);
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
      onMessage?.(
        result.data.warnings?.length
          ? `Court pack opened and JSON saved with ${result.data.warnings.length} collection warning(s).`
          : 'Court evidence pack opened and sealed JSON saved.'
      );
    }
  };

  const handleFormalAccounting = async () => {
    setBusy(true);
    const result = await estateInventoryService.getFormalAccountingStatement(caseNumber);
    setBusy(false);
    if (!result.success) {
      onMessage?.(result.error || 'Could not build formal accounting.');
      return;
    }
    const opened = openFormalAccountingStatement(result.data);
    if (!opened.success) onMessage?.(opened.error);
    else onMessage?.('Formal accounting statement opened — use Print / Save as PDF.');
  };

  const handlePdf = async () => {
    setBusy(true);
    const items = await loadCatalog();
    setBusy(false);
    if (!items) return;
    const result = openPrintablePdfCatalog({
      caseNumber: caseNumber || caseLabel,
      items,
      generatedAt: new Date().toLocaleString()
    });
    if (!result.success) onMessage?.(result.error);
    else onMessage?.('Court catalog opened — use Print / Save as PDF in that window.');
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
              Case {caseLabel} · court and share exports
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
              <span className="ei-action-label">Court evidence pack</span>
              <span className="ei-action-hint">
                One click: printable binder + sealed JSON with inventory, finance, activity,
                scenes, heirs, claims, distributions, and formal accounting
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
                Period statement: beginning → receipts → expenses → distributions → ending
                balance
              </span>
            </button>
            <button type="button" className="ei-action" disabled={busy} onClick={handlePdf}>
              <span className="ei-action-label">Court PDF</span>
              <span className="ei-action-hint">
                Open printable catalog — use Print / Save as PDF
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
    </div>
  );
};

export default EstateReportsModal;
