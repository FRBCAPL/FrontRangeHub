import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  buildPrintableCatalogHtml,
  downloadJsonFile
} from '@shared/utils/estateExport.js';
import {
  buildCourtPackHtml,
  downloadCourtPackJson
} from '@shared/utils/estateCourtPack.js';
import { buildFormalAccountingHtml } from '@shared/utils/estateFormalAccounting.js';
import {
  buildAuctionReconciliation,
  buildAuctionReconciliationHtml
} from '@shared/utils/estateAuctionReconciliation.js';
import { saleAuctionCopy } from '@shared/utils/estateSaleAuctionCopy.js';
import {
  buildInventoryReconciliation,
  buildInventoryReconciliationHtml
} from '@shared/utils/estateInventoryReconciliation.js';
import { completenessConfirmMessage, formatCompletenessBannerHtml } from '@shared/utils/estateCompleteness.js';
import { buildAdministrationChronologyHtml } from '@shared/utils/estateAdministrationChronology.js';
import { buildGiftResidualScheduleHtml } from '@shared/utils/estateGiftResidualSchedule.js';
import EstateDecisionNotesModal from './EstateDecisionNotesModal.jsx';
import FamilyUpdatePreviewModal from './FamilyUpdatePreviewModal.jsx';
import EstateReportPreviewModal from './EstateReportPreviewModal.jsx';

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
 * Admin reports: preview printable reports in-app, then Download PDF / HTML.
 * Share link + catalog JSON backup stay as instant actions.
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
  const [familyPreviewPack, setFamilyPreviewPack] = useState(null);
  const [reportPreview, setReportPreview] = useState(null);
  const caseLabel = displayCaseNumber || caseNumber || 'estate';
  const busy = Boolean(busyLabel);

  const openReportPreview = ({ title, subtitle, html, filenameBase, courtPack = null }) => {
    setReportPreview({
      title,
      subtitle: subtitle || `${caseLabel} · choose PDF or HTML after reviewing`,
      html,
      filenameBase,
      courtPack
    });
  };

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
    setBusyLabel('Building evidence pack…');
    try {
      const result = await withTimeout(
        estateInventoryService.buildCourtEvidencePack(caseNumber),
        'Evidence pack'
      );
      if (!result.success) {
        onMessage?.(result.error || 'Could not build court pack.');
        return;
      }
      const ready = result.data.filing_ready;
      openReportPreview({
        title: 'Evidence pack (supporting)',
        subtitle: ready
          ? `${caseLabel} · supporting binder · download PDF/HTML (JSON optional)`
          : `${caseLabel} · working draft — ${result.data.completeness?.blockingCount || 0} blocking gap(s)`,
        html: buildCourtPackHtml(result.data),
        filenameBase: `evidence-pack-${caseLabel}`,
        courtPack: result.data
      });
      onMessage?.(
        ready
          ? 'Evidence pack ready to preview. Download PDF or HTML (JSON available in the preview).'
          : 'Working draft evidence pack ready to preview (supporting record incomplete).'
      );
    } catch (err) {
      onMessage?.(err?.message || 'Evidence pack failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const runFormalAccounting = async () => {
    setBusyLabel('Building formal accounting…');
    try {
      const result = await withTimeout(
        estateInventoryService.getFormalAccountingStatement(caseNumber),
        'Formal accounting'
      );
      if (!result.success) {
        onMessage?.(result.error || 'Could not build formal accounting.');
        return;
      }
      openReportPreview({
        title: 'Formal accounting',
        subtitle: result.data.completeness?.filingReady
          ? `${caseLabel} · supporting schedule — review with counsel before filing`
          : `${caseLabel} · working draft (supporting record incomplete)`,
        html: buildFormalAccountingHtml(result.data),
        filenameBase: `formal-accounting-${caseLabel}`
      });
    } catch (err) {
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
      const generatedAt = new Date().toLocaleString();
      openReportPreview({
        title: 'Inventory catalog',
        subtitle: `${caseLabel} · supporting document — not a filing`,
        html: buildPrintableCatalogHtml({
          caseNumber: caseNumber || caseLabel,
          items,
          generatedAt,
          certificateHtml: certificate ? formatCompletenessBannerHtml(certificate) : ''
        }),
        filenameBase: `inventory-catalog-${caseLabel}`
      });
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
    setBusyLabel(`Building ${saleAuctionCopy.reconciliation.toLowerCase()}…`);
    try {
      const [settingsResult, auctionResult] = await Promise.all([
        estateInventoryService.getSettings(caseNumber),
        estateInventoryService.listFinanceAuctionItems(caseNumber)
      ]);
      if (!auctionResult.success) {
        onMessage?.(auctionResult.error || 'Could not load sale inventory lots.');
        return;
      }
      const report = buildAuctionReconciliation({
        paid: auctionResult.data?.paid || [],
        outstanding: auctionResult.data?.outstanding || [],
        unsold: auctionResult.data?.unsold || [],
        estateName: settingsResult.data?.estate_name || 'Estate',
        caseNumber: caseLabel
      });
      openReportPreview({
        title: saleAuctionCopy.reconciliation,
        html: buildAuctionReconciliationHtml(report),
        filenameBase: `auction-reconciliation-${caseLabel}`
      });
    } catch (err) {
      onMessage?.(err?.message || `${saleAuctionCopy.reconciliation} failed.`);
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
      const payload = {
        reconciliation: buildInventoryReconciliation(items),
        estateName: settingsResult.data?.estate_name || 'Estate',
        caseNumber: caseLabel
      };
      openReportPreview({
        title: 'Inventory reconciliation',
        html: buildInventoryReconciliationHtml(payload),
        filenameBase: `inventory-reconciliation-${caseLabel}`
      });
    } catch (err) {
      onMessage?.(err?.message || 'Inventory reconciliation failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const handleFamilyUpdatePreview = async () => {
    setBusyLabel('Building Family Update preview…');
    try {
      const result = await estateInventoryService.getFamilyUpdatePackage(caseNumber);
      if (!result.success) {
        onMessage?.(result.error || 'Could not build Family Update.');
        return;
      }
      setFamilyPreviewPack(result.data);
    } catch (err) {
      onMessage?.(err?.message || 'Family Update failed.');
    } finally {
      setBusyLabel('');
    }
  };

  const publishFamilyUpdateFromPreview = async (prNote) => {
    const result = await estateInventoryService.publishFamilyUpdate({
      caseNumber,
      prNote
    });
    if (!result.success) {
      return { success: false, error: result.error || 'Could not publish Family Update.' };
    }
    const updateNumber = result.data.update_number;
    onMessage?.(
      `Published Family Update #${updateNumber}. Beneficiaries can read it in the family portal.`
    );
    return {
      success: true,
      updateNumber,
      message: `Published Family Update #${updateNumber}. Beneficiaries can read it in the family portal.`
    };
  };

  const handleChronology = async () => {
    setBusyLabel('Building chronology…');
    try {
      const result = await estateInventoryService.getAdministrationChronologyExport(caseNumber);
      if (!result.success) {
        onMessage?.(result.error || 'Could not build chronology.');
        return;
      }
      openReportPreview({
        title: 'Administration chronology',
        subtitle: `${caseLabel} · supporting timeline`,
        html: buildAdministrationChronologyHtml(result.data),
        filenameBase: `admin-chronology-${caseLabel}`
      });
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
      openReportPreview({
        title: 'Gift & residual schedule',
        subtitle: `${caseLabel} · counsel review aid`,
        html: buildGiftResidualScheduleHtml(result.data),
        filenameBase: `gift-residual-${caseLabel}`
      });
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

  const previewHint = 'Opens a preview, then Download PDF or Download HTML';

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
              reports. Review with counsel before filing. Printable reports open a
              preview first — then download PDF or HTML.
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
                {previewHint}. Completeness runs first; companion JSON available in preview
              </span>
            </button>
            <button
              type="button"
              className="ei-action"
              disabled={busy}
              onClick={handleFamilyUpdatePreview}
            >
              <span className="ei-action-label">Family Update</span>
              <span className="ei-action-hint">
                {previewHint}, or publish to the family portal
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
                {previewHint} — period statement with completeness gaps
              </span>
            </button>
            <button
              type="button"
              className="ei-action"
              disabled={busy}
              onClick={handleAuctionReconciliation}
            >
              <span className="ei-action-label">{saleAuctionCopy.reconciliation}</span>
              <span className="ei-action-hint">
                {previewHint} — sold, pending, and unsold lots
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
                {previewHint} — every item in exactly one disposition
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
                {previewHint} — Letters, distributions, Family Updates, activity
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
                {previewHint} — memorandum gifts + residual sketch
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
              <span className="ei-action-label">Inventory catalog</span>
              <span className="ei-action-hint">
                {previewHint} — supporting catalog with completeness status
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

      <FamilyUpdatePreviewModal
        open={Boolean(familyPreviewPack)}
        pack={familyPreviewPack}
        title="Family Update"
        subtitle={`${caseLabel} · download or publish after reviewing`}
        onClose={() => setFamilyPreviewPack(null)}
        onPublish={publishFamilyUpdateFromPreview}
      />

      <EstateReportPreviewModal
        open={Boolean(reportPreview)}
        html={reportPreview?.html || ''}
        title={reportPreview?.title || 'Report'}
        subtitle={reportPreview?.subtitle}
        filenameBase={reportPreview?.filenameBase || 'estate-report'}
        onClose={() => setReportPreview(null)}
        footExtra={
          reportPreview?.courtPack ? (
            <button
              type="button"
              className="ei-btn ei-btn-small ei-btn-secondary"
              onClick={() => {
                downloadCourtPackJson(reportPreview.courtPack);
                onMessage?.('Evidence pack JSON downloaded.');
              }}
            >
              Download JSON
            </button>
          ) : null
        }
      />
    </div>
  );
};

export default EstateReportsModal;
