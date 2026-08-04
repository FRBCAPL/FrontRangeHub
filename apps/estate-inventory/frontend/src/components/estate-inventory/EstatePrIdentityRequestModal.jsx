import React, { useEffect, useState } from 'react';
import {
  submitIdentityRequest,
  cancelIdentityRequest
} from '@shared/services/estatePrIdentityService.js';

/**
 * PR requests supervised transfer of all owned estates to a different auth account.
 */
const EstatePrIdentityRequestModal = ({
  open,
  onClose,
  profile,
  sessionEmail,
  openRequest,
  onSubmitted,
  onCancelled
}) => {
  const [currentLegalName, setCurrentLegalName] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [requestedLegalName, setRequestedLegalName] = useState('');
  const [requestedEmail, setRequestedEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCurrentLegalName(profile?.legal_name || '');
    setCurrentEmail(sessionEmail || profile?.email || '');
    setRequestedLegalName('');
    setRequestedEmail('');
    setReason('');
    setBusy(false);
    setError('');
  }, [open, profile, sessionEmail]);

  if (!open) return null;

  const canCancel = openRequest?.status === 'pending_super_review';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError('Explain why you need this change (at least 10 characters).');
      return;
    }
    setBusy(true);
    setError('');
    const result = await submitIdentityRequest({
      currentLegalName,
      currentEmail,
      requestedLegalName,
      requestedEmail,
      reason
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not submit request.');
      return;
    }
    onSubmitted?.(result.data);
    onClose?.();
  };

  const handleCancel = async () => {
    if (!openRequest?.id || !canCancel) return;
    setBusy(true);
    setError('');
    const result = await cancelIdentityRequest(openRequest.id);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not cancel request.');
      return;
    }
    onCancelled?.();
    onClose?.();
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-pr-identity-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-pr-identity-title">Request identity change</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <p className="ei-settings-hint">
            To use a dedicated estate email, create and confirm that PR account first, then request
            a transfer here. An operator must approve; you will confirm from your <strong>current</strong>{' '}
            email before any change is applied.
          </p>

          {openRequest && openRequest.status !== 'cancelled' ? (
            <div className="ei-notice">
              <strong>Current request:</strong> {openRequest.status.replace(/_/g, ' ')}
              {openRequest.super_review_reason ? (
                <>
                  <br />
                  Operator note: {openRequest.super_review_reason}
                </>
              ) : null}
            </div>
          ) : null}

          <div className="ei-field">
            <label htmlFor="ei-pr-id-current-name">Current legal name</label>
            <input
              id="ei-pr-id-current-name"
              value={currentLegalName}
              onChange={(e) => setCurrentLegalName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              readOnly={Boolean(profile?.legal_name)}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-pr-id-current-email">Current email (this account)</label>
            <input
              id="ei-pr-id-current-email"
              type="email"
              value={currentEmail}
              readOnly
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-pr-id-new-name">New legal name</label>
            <input
              id="ei-pr-id-new-name"
              value={requestedLegalName}
              onChange={(e) => setRequestedLegalName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              placeholder="Name on court letters / fiduciary records"
              disabled={Boolean(openRequest && !canCancel)}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-pr-id-new-email">New email (existing PR account)</label>
            <input
              id="ei-pr-id-new-email"
              type="email"
              value={requestedEmail}
              onChange={(e) => setRequestedEmail(e.target.value)}
              required
              placeholder="you@estate-email.example"
              disabled={Boolean(openRequest && !canCancel)}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-pr-id-reason">Reason for change</label>
            <textarea
              id="ei-pr-id-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              minLength={10}
              required
              placeholder="e.g. Moving PR login from personal Gmail to dedicated estate email for court records."
              disabled={Boolean(openRequest && !canCancel)}
            />
          </div>

          {error ? <div className="ei-error">{error}</div> : null}

          <div className="ei-btn-row">
            {canCancel ? (
              <button
                type="button"
                className="ei-btn ei-btn-secondary"
                onClick={handleCancel}
                disabled={busy}
              >
                Cancel request
              </button>
            ) : null}
            {!openRequest || canCancel ? (
              <button
                type="submit"
                className="ei-btn"
                disabled={
                  busy ||
                  reason.trim().length < 10 ||
                  requestedLegalName.trim().length < 2 ||
                  !requestedEmail.trim()
                }
              >
                {busy ? 'Submitting…' : 'Submit for review'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EstatePrIdentityRequestModal;
