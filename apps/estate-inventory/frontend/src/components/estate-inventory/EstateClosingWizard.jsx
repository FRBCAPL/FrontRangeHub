import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { buildClosingChecklist } from '@shared/utils/estateClosingReadiness.js';
import {
  downloadCourtPackJson,
  writeCourtPackWindow
} from '@shared/utils/estateCourtPack.js';
import { openFormalAccountingStatement } from '@shared/utils/estateFormalAccounting.js';
import {
  downloadFamilyUpdate,
  openFamilyUpdate
} from '@shared/utils/estateFamilyUpdate.js';
import { completenessConfirmMessage } from '@shared/utils/estateCompleteness.js';
import EstateModalShell from './EstateModalShell.jsx';

const STATUS_ICON = { done: '\u2713', warn: '!', info: 'i' };

/**
 * The closing chapter: a single checklist that gathers everything the app
 * already knows about the estate, then lets the PR close for records with a
 * written reason. Advisory only — nothing here blocks a PR from closing.
 */
const EstateClosingWizard = ({ open, caseNumber, onClose, onClosed }) => {
  const [readiness, setReadiness] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [packBusy, setPackBusy] = useState(false);
  const [accountingBusy, setAccountingBusy] = useState(false);
  const [familyBusy, setFamilyBusy] = useState(false);
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
      claimsEnded: readiness.claimsEnded
    });
  }, [readiness]);

  const generateCourtPack = async () => {
    setPackBusy(true);
    setError('');
    const cert = await estateInventoryService.getCompletenessCertificate(caseNumber);
    if (cert.success && !window.confirm(completenessConfirmMessage(cert.data))) {
      setPackBusy(false);
      setInfo('Court pack cancelled.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<!doctype html><title>Preparing court pack…</title><p style="font-family:system-ui;padding:2rem">Preparing court evidence pack…</p>'
      );
    }
    const result = await estateInventoryService.buildCourtEvidencePack(caseNumber);
    setPackBusy(false);
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
  };

  const generateFormalAccounting = async () => {
    setAccountingBusy(true);
    setError('');
    const cert = await estateInventoryService.getCompletenessCertificate(caseNumber);
    if (cert.success && !window.confirm(completenessConfirmMessage(cert.data))) {
      setAccountingBusy(false);
      setInfo('Formal accounting cancelled.');
      return;
    }
    const result = await estateInventoryService.getFormalAccountingStatement(caseNumber);
    setAccountingBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not build formal accounting.');
      return;
    }
    const opened = openFormalAccountingStatement(result.data);
    if (!opened.success) setError(opened.error);
    else setInfo('Formal accounting opened — check the completeness banner before filing.');
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
      const downloaded = downloadFamilyUpdate(preview.data);
      if (!downloaded.success) {
        const opened = openFamilyUpdate(preview.data);
        if (!opened.success) setError(opened.error || downloaded.error);
        else setInfo('Family Update preview opened — publish requires the Family Updates migration.');
        return;
      }
      setInfo(
        `${result.error || 'Could not publish.'} Preview downloaded instead.`
      );
      return;
    }
    downloadFamilyUpdate({
      ...result.data.package,
      updateNumber: result.data.update_number
    });
    setInfo(
      `Published Family Update #${result.data.update_number} to the family portal.`
    );
  };

  const closeEstate = async () => {
    setError('');
    if (reason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters.');
      return;
    }
    const warnMsg = checklist?.warnings
      ? `${checklist.warnings} item(s) still need attention. Close the estate anyway?`
      : 'Close this estate for records? It becomes view-and-export only.';
    if (!window.confirm(warnMsg)) return;
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
            : `${checklist.readyCount} of ${checklist.totalCount} ready · ${checklist.warnings} need attention`
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
              disabled={busy || !readiness}
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
              : 'Review each item below. These are guidance — you keep authority to close whenever you choose. Closing creates a view-and-export-only record; it does not delete anything.'}
          </p>

          <ul className="ei-closing-checklist">
            {checklist.items.map((item) => (
              <li key={item.key} className={`ei-closing-item is-${item.status}`}>
                <span className="ei-closing-icon" aria-hidden="true">
                  {STATUS_ICON[item.status]}
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

          {!alreadyClosed ? (
            <div className="ei-field">
              <label htmlFor="ei-closing-reason">Reason for closing (required)</label>
              <textarea
                id="ei-closing-reason"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Distribution complete; preserving final estate record"
              />
              <p className="ei-field-hint">
                Your email, reason, and time are saved in the activity and settings histories.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </EstateModalShell>
  );
};

export default EstateClosingWizard;
