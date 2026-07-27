import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  openPrintablePdfCatalog,
  downloadJsonFile
} from '@shared/utils/estateExport.js';
import { CASE_NUMBER } from '@shared/utils/estateInventoryConstants.js';

/**
 * Admin reports launcher — opens a modal with court PDF, share link, and JSON export.
 */
const ExportToolbar = ({ caseNumber, onMessage }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadCatalog = async () => {
    const result = await estateInventoryService.listAllItemsWithRooms();
    if (!result.success) {
      onMessage?.(result.error || 'Could not load catalog.');
      return null;
    }
    return result.data;
  };

  const handlePdf = async () => {
    setBusy(true);
    const items = await loadCatalog();
    setBusy(false);
    if (!items) return;
    const result = openPrintablePdfCatalog({
      caseNumber: caseNumber || CASE_NUMBER,
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
      caseNumber: caseNumber || CASE_NUMBER,
      items,
      generatedAt: new Date().toISOString()
    });
    onMessage?.('JSON catalog downloaded.');
  };

  const handleShare = async () => {
    setBusy(true);
    const result = await estateInventoryService.createReadOnlyShareLink();
    setBusy(false);
    if (!result.success) {
      onMessage?.(result.error || 'Could not create share link.');
      return;
    }
    const url = result.data?.publicUrl;
    if (url && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        onMessage?.(`Read-only link copied for Matthew & Karolyn: ${url}`);
        return;
      } catch {
        // fall through
      }
    }
    onMessage?.(url ? `Read-only link: ${url}` : 'Share link created.');
  };

  return (
    <>
      <div className="ei-export-toolbar">
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={() => setOpen(true)}
        >
          Reports
        </button>
      </div>

      {open ? (
        <div className="ei-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
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
                  Case {caseNumber || CASE_NUMBER} · court and share exports
                </p>
              </div>
              <button
                type="button"
                className="ei-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="ei-modal-body">
              <div className="ei-reports-actions">
                <button
                  type="button"
                  className="ei-action"
                  disabled={busy}
                  onClick={handlePdf}
                >
                  <span className="ei-action-label">Court PDF</span>
                  <span className="ei-action-hint">
                    Open printable catalog — use Print / Save as PDF
                  </span>
                </button>
                <button
                  type="button"
                  className="ei-action"
                  disabled={busy}
                  onClick={handleShare}
                >
                  <span className="ei-action-label">Share read-only</span>
                  <span className="ei-action-hint">
                    Copy a frozen public inventory link (point-in-time snapshot)
                  </span>
                </button>
                <button
                  type="button"
                  className="ei-action"
                  disabled={busy}
                  onClick={handleJson}
                >
                  <span className="ei-action-label">Download JSON</span>
                  <span className="ei-action-hint">Machine-readable catalog backup</span>
                </button>
              </div>
              {busy ? <p className="ei-status" style={{ marginTop: '0.75rem' }}>Working…</p> : null}
            </div>
            <div className="ei-modal-foot ei-btn-row">
              <button type="button" className="ei-btn" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ExportToolbar;
