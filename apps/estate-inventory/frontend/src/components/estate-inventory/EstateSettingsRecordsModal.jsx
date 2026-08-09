import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { buildClosingChecklist } from '@shared/utils/estateClosingReadiness.js';
import { EstateSettingsShell } from './EstateSettingsShell';

const EstateSettingsRecordsModal = ({ open, onClose, settings, onChanged }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [readinessReady, setReadinessReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setError('');
    setBusy(false);
    setReadiness(null);
    setReadinessReady(Boolean(settings?.closed_at));
    if (settings?.closed_at) return;
    let cancelled = false;
    (async () => {
      const result = await estateInventoryService.getDistributionReadiness(
        settings?.case_number
      );
      if (cancelled) return;
      if (result.success) setReadiness(result.data);
      setReadinessReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, settings?.case_number, settings?.closed_at]);

  const checklist = useMemo(() => {
    if (!readiness || settings?.closed_at) return null;
    return buildClosingChecklist({
      settings: readiness.settings || settings || {},
      finance: readiness.finance || {},
      distributions: readiness.existingDistributions || [],
      pendingReviewCount: readiness.pendingReviewCount || 0,
      heirCount: (readiness.heirs || []).length,
      claimsEnded: readiness.claimsEnded,
      liquidAvailable: readiness.liquidAvailable
    });
  }, [readiness, settings]);

  if (!open) return null;

  const isClosed = Boolean(settings?.closed_at);
  const closeBlocked = !isClosed && checklist && !checklist.canClose;
  const closeLoading = !isClosed && !readinessReady;

  const submit = async () => {
    setError('');
    if (reason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters.');
      return;
    }
    if (!isClosed) {
      if (checklist && !checklist.canClose) {
        setError(
          checklist.blockingReasons?.[0] ||
            'Collect outstanding distribution acknowledgements before closing.'
        );
        return;
      }
      const confirmMsg =
        checklist?.confirmMessage ||
        'Close this estate for records?\n\nFamily, helper, and advisor portals will stop working. Only you can still view and export.\n\nContinue?';
      if (!window.confirm(confirmMsg)) return;
    }
    setBusy(true);
    const result = isClosed
      ? await estateInventoryService.reopenEstateForWork(settings?.case_number, reason.trim())
      : await estateInventoryService.closeEstateForRecords(settings?.case_number, reason.trim());
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not change record status.');
      return;
    }
    setReason('');
    await onChanged?.();
  };

  return (
    <EstateSettingsShell
      open
      onClose={onClose}
      title="Records & retention"
      titleId="ei-records-retention-title"
      foot={
        <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="ei-modal-body">
        <h4>{isClosed ? 'Estate is closed for records' : 'Estate is open for work'}</h4>
        <p className="ei-settings-hint">
          {isClosed
            ? `Closed ${new Date(settings.closed_at).toLocaleString()}. Inventory, finance, settings, family, helper, and auction writes are blocked by the database. As Personal Representative, viewing and court exports remain available. Family, helper, and advisor portals cannot sign in while closed.`
            : 'Closing creates a view-and-export-only record for you (the Personal Representative). Family, helper, and advisor portals stop working until you reopen. It does not hide or delete the estate.'}
        </p>

        {!isClosed && checklist && !checklist.canClose ? (
          <div className="ei-error">{checklist.blockingReasons?.[0]}</div>
        ) : null}

        <div className="ei-portal-card">
          <h4>What Estate Vault keeps</h4>
          <ul className="ei-super-effects">
            <li>Live estate data stays until an authorized PR or operator acts.</li>
            <li>Hide is reversible and does not delete records.</li>
            <li>Permanent test deletion writes a sealed archive first.</li>
            <li>Operator audit entries are append-only and cannot be edited or deleted.</li>
            <li>Recommended retention: sealed archives for at least 7 years after estate close.</li>
          </ul>
        </div>

        <div className="ei-field">
          <label htmlFor="ei-record-status-reason">
            {isClosed ? 'Reason for reopening' : 'Reason for closing'} (required)
          </label>
          <textarea
            id="ei-record-status-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder={
              isClosed
                ? 'e.g. Newly discovered property requires additional inventory work'
                : 'e.g. Distribution complete; preserving final estate record'
            }
            aria-invalid={
              Boolean(error) || (reason.length > 0 && reason.trim().length < 8)
                ? true
                : undefined
            }
            aria-describedby="ei-record-status-reason-help"
          />
          {reason.length > 0 && reason.trim().length < 8 ? (
            <p id="ei-record-status-reason-help" className="ei-field-hint ei-field-hint--warn">
              Enter a reason of at least 8 characters.
            </p>
          ) : (
            <p id="ei-record-status-reason-help" className="ei-field-hint">
              Your email, reason, and time are saved in the activity and settings histories.
            </p>
          )}
        </div>

        {error ? <div className="ei-error">{error}</div> : null}

        <button
          type="button"
          className={`ei-btn${isClosed ? '' : ' ei-btn-danger'}`}
          disabled={busy || closeBlocked || closeLoading}
          title={
            !isClosed && checklist && !checklist.canClose
              ? checklist.blockingReasons?.[0] || 'Outstanding acknowledgements required'
              : closeLoading
                ? 'Loading closing checklist…'
                : ''
          }
          onClick={submit}
        >
          {busy
            ? 'Saving…'
            : isClosed
              ? 'Reopen estate for work'
              : 'Close estate for records'}
        </button>

        {settings?.close_reason ? (
          <p className="ei-settings-hint">
            Last close reason: <strong>{settings.close_reason}</strong>
          </p>
        ) : null}
      </div>
    </EstateSettingsShell>
  );
};

export default EstateSettingsRecordsModal;
