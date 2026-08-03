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

const BUILD_TIMEOUT_MS = 90_000;

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${BUILD_TIMEOUT_MS / 1000}s. Check your connection and try again.`));
    }, BUILD_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

/**
 * Admin reports: court evidence pack, printable PDF, read-only share link, and
 * JSON backup. Completeness confirm runs in-app (not window.confirm) so it is
 * not trapped behind this modal while Working… shows.
 */
const EstateReportsModal = ({
  open,
  onClose,
  caseNumber,
  displayCaseNumber = null,
  onMessage
}) => {
  const [busyLabel, setBusyLabel] = useState('');
  const [gate, setGate] = useState(null);
  const [showDecisionNotes, setShowDecisionNotes] = useState(false);
  const caseLabel = displayCaseNumber || caseNumber || 'estate';
  const busy = Boolean(busyLabel);

  const loadCatalog = async () => {
    const result = await estateInventoryService.listAllItemsWithRooms(caseNumber);
    if (!result.success) {
      onMessage?.(result.error || 'Could not load catalog.');
      return null;
    }
    return result.data;
  };

  const requestCompletenessGate = async (action) => {
    setBusyLabel('Checking completeness…');
    try {
      const result = await withTimeout(
        estateInventoryService.getCompletenessCertificate(caseNumber),
        'Completeness check'
      );
      if (!result.success) {
        onMessage?.(result.error || 'Could not run completeness check.');
        return;
      }
      setGate({ action, certificate: result.data });
    } catch (err) {
      onMessage?.(err?.message || 'Completeness check failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const runCourtPack = async () => {
    // Open on this click (fresh user gesture) so popup blockers do not win.
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      try {
        printWindow.document.write(
          '<!doctype html><title>Preparing evidence pack…</title><p style="font-family:system-ui;padding:2rem">Preparing court evidence pack…</p>'
        );
      } catch {
        // cross-origin / restricted document — writeCourtPackWindow falls back
      }
    }
    setBusyLabel('Building evidence pack…');
    try {
      const result = await withTimeout(
        estateInventoryService.buildCourtEvidencePack(caseNumber),
        'Evidence pack'
      );
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
            ? 'Evidence pack opened and JSON saved (point-in-time snapshot with integrity hash — not a court seal). Still reconcile to bank statements before filing.'
            : `Working draft evidence pack saved — supporting record incomplete (${result.data.completeness?.blockingCount || 0} blocking gap(s)). Point-in-time snapshot only; later edits can make it stale.`
        );
      }
    } catch (err) {
      printWindow?.close();
      onMessage?.(err?.message || 'Evidence pack failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const runFormalAccounting = async () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      try {
        printWindow.document.write(
          '<!doctype html><title>Preparing formal accounting…</title><p style="font-family:system-ui;padding:2rem">Preparing formal accounting…</p>'
        );
      } catch {
        // restricted document — openFormalAccountingStatement falls back
      }
    }
    setBusyLabel('Building formal accounting…');
    try {
      const result = await withTimeout(
        estateInventoryService.getFormalAccountingStatement(caseNumber),
        'Formal accounting'
      );
      if (!result.success) {
        printWindow?.close();
        onMessage?.(result.error || 'Could not build formal accounting.');
        return;
      }
      const opened = openFormalAccountingStatement(result.data, printWindow);
      if (!opened.success) onMessage?.(opened.error);
      else {
        onMessage?.(
          result.data.completeness?.filingReady
            ? 'Formal accounting opened — supporting schedule. Review with counsel before filing.'
            : 'Formal accounting opened as a working draft (supporting record incomplete).'
        );
      }
    } catch (err) {
      printWindow?.close();
      onMessage?.(err?.message || 'Formal accounting failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const runCatalogPdf = async (certificate) => {
    setBusyLabel('Building catalog…');
    try {
      const items = await loadCatalog();
      if (!items) return;
      const result = openPrintablePdfCatalog({
        caseNumber: caseNumber || caseLabel,
        items,
        generatedAt: new Date().toLocaleString(),
        certificateHtml: certificate
          ? formatCompletenessBannerHtml(certificate)
          : ''
      });
      if (!result.success) onMessage?.(result.error);
      else onMessage?.('Catalog opened — supporting document, not a filing. Use Print / Save as PDF.');
    } catch (err) {
      onMessage?.(err?.message || 'Catalog export failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const confirmGate = async () => {
    const next = gate;
    setGate(null);
    if (!next) return;
    if (next.action === 'court') await runCourtPack();
    else if (next.action === 'accounting') await runFormalAccounting();
    else if (next.action === 'catalog') await runCatalogPdf(next.certificate);
  };

  const handleAuctionReconciliation = async () => {
    setBusyLabel('Building sale/auction reconciliation…');
    try {
      const [settingsResult, auctionResult] = await Promise.all([
        estateInventoryService.getSettings(caseNumber),
        estateInventoryService.listFinanceAuctionItems(caseNumber)
      ]);
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
    } catch (err) {
      onMessage?.(err?.message || 'Auction reconciliation failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const handleInventoryReconciliation = async () => {
    setBusyLabel('Building inventory reconciliation…');
    try {
      const [settingsResult, items] = await Promise.all([
        estateInventoryService.getSettings(caseNumber),
        loadCatalog()
      ]);
      if (!items) return;
      const opened = openInventoryReconciliation({
        reconciliation: buildInventoryReconciliation(items),
        estateName: settingsResult.data?.estate_name || 'Estate',
        caseNumber: caseLabel
      });
      if (!opened.success) onMessage?.(opened.error);
      else onMessage?.('Inventory reconciliation opened — use Print / Save as PDF.');
    } catch (err) {
      onMessage?.(err?.message || 'Inventory reconciliation failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const handleFamilyUpdate = async () => {
    setBusyLabel('Building Family Update…');
    try {
      const result = await estateInventoryService.getFamilyUpdatePackage(caseNumber);
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
    } catch (err) {
      onMessage?.(err?.message || 'Family Update failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const handlePublishFamilyUpdate = async () => {
    const note =
      window.prompt(
        'Optional note for beneficiaries (appears with this Family Update):',
        ''
      ) ?? null;
    if (note === null) return;
    setBusyLabel('Publishing Family Update…');
    try {
      const result = await estateInventoryService.publishFamilyUpdate({
        caseNumber,
        prNote: note
      });
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
    } catch (err) {
      onMessage?.(err?.message || 'Publish Family Update failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const handleChronology = async () => {
    setBusyLabel('Building chronology…');
    try {
      const result = await estateInventoryService.getAdministrationChronologyExport(caseNumber);
      if (!result.success) {
        onMessage?.(result.error || 'Could not build chronology.');
        return;
      }
      openAdministrationChronology(result.data);
      onMessage?.('Administration chronology opened (supporting timeline).');
    } catch (err) {
      onMessage?.(err?.message || 'Chronology failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const handleGiftResidual = async () => {
    setBusyLabel('Building gift & residual schedule…');
    try {
      const result = await estateInventoryService.getGiftResidualScheduleExport(caseNumber);
      if (!result.success) {
        onMessage?.(result.error || 'Could not build gift & residual schedule.');
        return;
      }
      openGiftResidualSchedule(result.data);
      onMessage?.('Gift & residual schedule opened (supporting documentation).');
    } catch (err) {
      onMessage?.(err?.message || 'Gift & residual schedule failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const handleJson = async () => {
    setBusyLabel('Preparing catalog JSON…');
    try {
      const items = await loadCatalog();
      if (!items) return;
      downloadJsonFile({
        caseNumber: caseNumber || caseLabel,
        items,
        generatedAt: new Date().toISOString()
      });
      onMessage?.(
        'Catalog-only JSON backup downloaded (inventory items). For Needs attention / completeness, use Evidence Pack or Formal Accounting.'
      );
    } catch (err) {
      onMessage?.(err?.message || 'JSON download failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const handleShare = async () => {
    setBusyLabel('Creating share link…');
    try {
      const result = await estateInventoryService.createReadOnlyShareLink(caseNumber);
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
    } catch (err) {
      onMessage?.(err?.message || 'Share link failed.');
    } finally {
      setBusyLabel('');
    }
  };

  if (!open) return null;

  const gateMessage = gate ? completenessConfirmMessage(gate.certificate) : '';
  const gateGenerateLabel =
    gate?.action === 'accounting'
      ? 'Generate formal accounting'
      : gate?.action === 'catalog'
        ? 'Generate catalog'
        : 'Generate evidence pack';

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
              reports. Review with counsel before filing. Exports include a generated
              time and the same completeness / Needs attention status from Home.
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
              onClick={() => requestCompletenessGate('court')}
            >
              <span className="ei-action-label">Evidence pack (supporting)</span>
              <span className="ei-action-hint">
                Printable supporting binder + JSON for your records. Completeness / Needs
                attention runs first and stays on the export. Later edits can make an earlier
                pack stale; the JSON hash is an integrity checksum, not a court seal
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
              onClick={() => requestCompletenessGate('accounting')}
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
            <button
              type="button"
              className="ei-action"
              disabled={busy}
              onClick={() => requestCompletenessGate('catalog')}
            >
              <span className="ei-action-label">Inventory catalog PDF</span>
              <span className="ei-action-hint">
                Supporting document — not a filing. Printable catalog with completeness status
              </span>
            </button>
            <button type="button" className="ei-action" disabled={busy} onClick={handleShare}>
              <span className="ei-action-label">Share read-only</span>
              <span className="ei-action-hint">
                Copy a frozen public inventory link (point-in-time snapshot)
              </span>
            </button>
            <button type="button" className="ei-action" disabled={busy} onClick={handleJson}>
              <span className="ei-action-label">Download JSON (catalog backup)</span>
              <span className="ei-action-hint">
                Inventory items only — not a supporting export (no Needs attention list)
              </span>
            </button>
          </div>
          {busyLabel ? (
            <p className="ei-status" style={{ marginTop: '0.75rem' }} aria-live="polite">
              {busyLabel}
            </p>
          ) : null}
        </div>
        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>
      </div>

      {gate ? (
        <div
          className="ei-reports-gate"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ei-reports-gate-title"
          onClick={(ev) => ev.stopPropagation()}
        >
          <div className="ei-reports-gate-card">
            <h4 id="ei-reports-gate-title">Completeness check</h4>
            <pre className="ei-reports-gate-body">{gateMessage}</pre>
            <div className="ei-btn-row">
              <button
                type="button"
                className="ei-btn ei-btn-secondary"
                onClick={() => {
                  setGate(null);
                  onMessage?.('Export cancelled.');
                }}
              >
                Cancel
              </button>
              <button type="button" className="ei-btn" onClick={confirmGate}>
                {gateGenerateLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
