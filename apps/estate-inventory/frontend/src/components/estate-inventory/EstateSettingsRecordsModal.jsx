import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { EstateSettingsShell } from './EstateSettingsShell';

const EstateSettingsRecordsModal = ({ open, onClose, settings, onChanged }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const isClosed = Boolean(settings?.closed_at);

  const submit = async () => {
    setError('');
    if (reason.trim().length < 8) {
      setError('Enter a reason of at least 8 characters.');
      return;
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
            ? `Closed ${new Date(settings.closed_at).toLocaleString()}. Inventory, finance, settings, family, helper, and auction writes are blocked by the database. Viewing and court exports remain available.`
            : 'Closing creates a view-and-export-only record. It does not hide or delete the estate.'}
        </p>

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
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isClosed
                ? 'e.g. Newly discovered property requires additional inventory work'
                : 'e.g. Distribution complete; preserving final estate record'
            }
          />
          <p className="ei-field-hint">
            Your email, reason, and time are saved in the activity and settings histories.
          </p>
        </div>

        {error ? <div className="ei-error">{error}</div> : null}

        <button
          type="button"
          className={`ei-btn${isClosed ? '' : ' ei-btn-danger'}`}
          disabled={busy}
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
