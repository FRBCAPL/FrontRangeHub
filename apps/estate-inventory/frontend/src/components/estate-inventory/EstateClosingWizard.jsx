import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { buildClosingChecklist } from '@shared/utils/estateClosingReadiness.js';
import {
  downloadCourtPackJson,
  writeCourtPackWindow
} from '@shared/utils/estateCourtPack.js';
import { openFormalAccountingStatement } from '@shared/utils/estateFormalAccounting.js';
import {
  openFamilyUpdate
} from '@shared/utils/estateFamilyUpdate.js';
import { completenessConfirmMessage } from '@shared/utils/estateCompleteness.js';
import { buildAndDownloadRecordsPack } from '@shared/utils/estateRecordsPack.js';
import EstateModalShell from './EstateModalShell.jsx';

const STATUS_ICON = { done: '\u2713', warn: '!', block: '!', info: 'i' };

/**
 * Closing checklist + close for records. Outstanding acknowledgements hard-block
 * close; claims / cash / portal lockout are warned in the confirm dialog.
 */
const EstateClosingWizard = ({ open, caseNumber, onClose, onClosed }) => {
  const [readiness, setReadiness] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [packBusy, setPackBusy] = useState(false);
  const [accountingBusy, setAccountingBusy] = useState(false);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [recordsPackBusy, setRecordsPackBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReason('');
    setError('');
    setInfo('');
    setReadiness(null);
    (async () => {
      const readinessResult = await estateInventoryService.getDistributionReadiness(caseNumber);
      if (cancelled) return;
      if (!readinessResult.success) {
        setError(readinessResult.error || 'Could not load closing checklist.');
        return;
      }
      setReadiness(readinessResult.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, caseNumber]);

  const checklist = useMemo(() => {
    if (!readiness) return null;
    return buildClosingChecklist({
      settings: readiness.settings || {},
      finance: readiness.finance || {},
      distributions: readiness.existingDistributions || [],
      pendingReviewCount: readiness.pendingReviewCount || 0,
      heirCount: (readiness.heirs || []).length,
      claimsEnded: readiness.claimsEnded,
      liquidAvailable: readiness.liquidAvailable
    });
  }, [readiness]);

  const generateCourtPack = async () => {
    setError('');
    setInfo('');
    setPackBusy(true);
    let printWindow = null;
    try {
      const cert = await estateInventoryService.getCompletenessCertificate(caseNumber);
      setPackBusy(false);
      if (cert.success && !window.confirm(completenessConfirmMessage(cert.data))) {
        setInfo('Court pack cancelled.');
        return;
      }
      printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(
          '<!doctype html><title>Preparing court pack…</title><p style="font-family:system-ui;padding:2rem">Preparing court evidence pack…</p>'
        );
      }
      setPackBusy(true);
      const result = await estateInventoryService.buildCourtEvidencePack(caseNumber);
      if (!result.success) {
        printWindow?.close();
        setError(result.error || 'Could not build court pack.');
        return;
      }
      downloadCourtPackJson(result.data);
      const opened = writeCourtPackWindow(printWindow, result.data);
      if (!opened.success) setError(opened.error);
      else {
        setInfo(
          result.data.filing_ready
            ? 'Evidence pack opened and JSON saved (point-in-time snapshot with integrity hash — not a court seal).'
            : 'Working draft evidence pack saved — supporting record incomplete. Point-in-time snapshot only; later edits can make it stale.'
        );
      }
    } catch (err) {
      printWindow?.close();
      setError(err?.message || 'Evidence pack failed.');
    } finally {
      setPackBusy(false);
    }
  };

  const downloadRecordsPack = async () => {
    setError('');
    setInfo('');
    setRecordsPackBusy(true);
    try {
      const cert = await estateInventoryService.getCompletenessCertificate(caseNumber);
      setRecordsPackBusy(false);
      if (cert.success && !window.confirm(completenessConfirmMessage(cert.data))) {
        setInfo('Records pack cancelled.');
        return;
      }
      setRecordsPackBusy(true);
      const result = await buildAndDownloadRecordsPack({
        caseNumber,
        onProgress: (label) => setInfo(label || 'Building pack…')
      });
      if (!result.success) {
        setError(result.error || 'Could not build records pack.');
        return;
      }
      const omitNote =
        result.omitted?.length > 0
          ? ` ${result.omitted.length} optional file(s) omitted — see README.txt.`
          : '';
      setInfo(
        `Full documentation pack downloaded (${result.folderName}.zip). Save this ZIP to a USB drive and keep a second copy.${omitNote}`
      );
    } catch (err) {
      setError(err?.message || 'Records pack failed.');
    } finally {
      setRecordsPackBusy(false);
    }
  };

  const generateFormalAccounting = async () => {
    setAccountingBusy(true);
    setError('');
    let printWindow = null;
    try {
      const cert = await estateInventoryService.getCompletenessCertificate(caseNumber);
      setAccountingBusy(false);
      if (cert.success && !window.confirm(completenessConfirmMessage(cert.data))) {
        setInfo('Formal accounting cancelled.');
        return;
      }
      printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(
          '<!doctype html><title>Preparing formal accounting…</title><p style="font-family:system-ui;padding:2rem">Preparing formal accounting…</p>'
        );
      }
      setAccountingBusy(true);
      const result = await estateInventoryService.getFormalAccountingStatement(caseNumber);
      if (!result.success) {
        printWindow?.close();
        setError(result.error || 'Could not build formal accounting.');
        return;
      }
      const opened = openFormalAccountingStatement(result.data, printWindow);
      if (!opened.success) setError(opened.error);
      else setInfo('Formal accounting opened — check the completeness banner before filing.');
    } catch (err) {
      printWindow?.close();
      setError(err?.message || 'Formal accounting failed.');
    } finally {
      setAccountingBusy(false);
    }
  };

  const generateFamilyUpdate = async () => {
    setFamilyBusy(true);
    setError('');
    const result = await estateInventoryService.publishFamilyUpdate({ caseNumber });
    setFamilyBusy(false);
    if (!result.success) {
      // Fall back to preview-only if publish migration is not applied yet.
      const preview = await estateInventoryService.getFamilyUpdatePackage(caseNumber);
      if (!preview.success) {
        setError(result.error || preview.error || 'Could not build Family Update.');
        return;
      }
      const opened = openFamilyUpdate(preview.data);
      if (!opened.success) setError(opened.error || result.error);
      else {
        setInfo(
          `${result.error || 'Could not publish.'} Preview opened — use Reports to download PDF or HTML.`
        );
      }
      return;
    }
    setInfo(
      `Published Family Update #${result.data.update_number} to the family portal. Use Reports → Preview Family Update to download PDF or HTML.`
    );
  };

  const closeEstate = async () => {
    setError('');
    if (reason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters.');
      return;
    }
    if (!checklist?.canClose) {
      setError(
        checklist?.blockingReasons?.[0] ||
          'Collect outstanding distribution acknowledgements before closing.'
      );
      return;
    }
    if (!window.confirm(checklist.confirmMessage)) return;
    setBusy(true);
    const result = await estateInventoryService.closeEstateForRecords(
      caseNumber,
      reason.trim()
    );
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not close the estate.');
      return;
    }
    setInfo('Estate closed for records.');
    await onClosed?.(result.data);
  };

  if (!open) return null;

  const alreadyClosed = checklist?.alreadyClosed;

  return (
    <EstateModalShell
      title="Close the estate"
      subtitle={
        checklist
          ? alreadyClosed
            ? 'This estate is already closed for records'
            : checklist.canClose
              ? `${checklist.readyCount} of ${checklist.totalCount} ready · ${checklist.warnings} need attention`
              : 'Cannot close yet — outstanding acknowledgements'
          : 'Reviewing the estate…'
      }
      onClose={onClose}
      className="ei-modal-closing"
      foot={
        <div className="ei-btn-row" style={{ justifyContent: 'space-between', width: '100%' }}>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
            Close
          </button>
          {!alreadyClosed ? (
            <button
              type="button"
              className="ei-btn ei-btn-danger"
              onClick={closeEstate}
              disabled={busy || !readiness || !checklist?.canClose}
              title={
                checklist && !checklist.canClose
                  ? checklist.blockingReasons?.[0] || 'Outstanding acknowledgements required'
                  : ''
              }
            >
              {busy ? 'Closing…' : 'Close estate for records'}
            </button>
          ) : null}
        </div>
      }
    >
      {error ? <div className="ei-error">{error}</div> : null}
      {info ? <p className="ei-status">{info}</p> : null}
      {!readiness && !error ? (
        <p className="ei-settings-hint">Loading the closing checklist…</p>
      ) : null}

      {checklist ? (
        <>
          <p className="ei-settings-hint">
            {alreadyClosed
              ? 'The estate is closed. Reopen it in Settings → Records & retention if you need to make changes.'
              : checklist.canClose
                ? 'Review each item below. Outstanding acknowledgements must be collected before close. New family, helper, and advisor sign-ins are blocked; existing sessions stay view-only. Only you keep full view and export. It does not delete anything.'
                : checklist.blockingReasons?.[0] ||
                  'Collect outstanding distribution acknowledgements before closing.'}
          </p>

          <ul className="ei-closing-checklist">
            {checklist.items.map((item) => (
              <li key={item.key} className={`ei-closing-item is-${item.status}`}>
                <span className="ei-closing-icon" aria-hidden="true">
                  {STATUS_ICON[item.status] || '!'}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="ei-closing-actions">
            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small"
              onClick={downloadRecordsPack}
              disabled={recordsPackBusy || packBusy || accountingBusy || familyBusy}
            >
              {recordsPackBusy ? 'Building pack…' : 'Download records pack'}
            </button>
            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small"
              onClick={generateFamilyUpdate}
              disabled={familyBusy}
            >
              {familyBusy ? 'Publishing…' : 'Publish Family Update'}
            </button>
            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small"
              onClick={generateFormalAccounting}
              disabled={accountingBusy}
            >
              {accountingBusy ? 'Preparing…' : 'Generate formal accounting'}
            </button>
            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small"
              onClick={generateCourtPack}
              disabled={packBusy}
            >
              {packBusy ? 'Preparing…' : 'Generate court evidence pack'}
            </button>
          </div>
          <p className="ei-field-hint" style={{ marginTop: '0.35rem' }}>
            Records pack is full documentation (reports, scenes, statements,
            receipts, notes). Save the ZIP to a USB drive and keep a second copy.
          </p>

          {!alreadyClosed ? (
            <div className="ei-field">
              <label htmlFor="ei-closing-reason">Reason for closing (required)</label>
              <textarea
                id="ei-closing-reason"
                rows={3}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. Distribution complete; preserving final estate record"
                aria-invalid={
                  Boolean(error) || (reason.length > 0 && reason.trim().length < 8)
                    ? true
                    : undefined
                }
                aria-describedby="ei-closing-reason-help"
              />
              {reason.length > 0 && reason.trim().length < 8 ? (
                <p id="ei-closing-reason-help" className="ei-field-hint ei-field-hint--warn">
                  Enter a reason of at least 8 characters.
                </p>
              ) : (
                <p id="ei-closing-reason-help" className="ei-field-hint">
                  Your email, reason, and time are saved in the activity and settings histories.
                </p>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </EstateModalShell>
  );
};

export default EstateClosingWizard;
