import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { useEstateCase } from './EstateCaseContext';

/**
 * Forgotten-PIN recovery for the estate owner. The PR has already proven who
 * they are by signing in, so the old PIN is not required — and since it is
 * bcrypt-hashed, it could not be shown even if it were.
 */
const EstateAdminPinResetModal = ({ open, caseLabel, onClose, onDone }) => {
  const { caseNumber } = useEstateCase();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPin('');
    setConfirmPin('');
    setShow(false);
    setBusy(false);
    setError('');
  }, [open]);

  if (!open) return null;

  const submit = async (ev) => {
    ev.preventDefault();
    if (pin !== confirmPin) {
      setError('The two entries do not match.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await estateInventoryService.resetAdminPasswordAsOwner(pin, caseNumber);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not reset the admin PIN.');
      return;
    }
    onDone?.(pin);
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-pin-reset-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-pin-reset-title">Set a new admin PIN</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="ei-modal-body">
            <p className="ei-settings-hint">
              You are signed in as the Personal Representative for case{' '}
              <strong>{caseLabel}</strong>, so you can set a new PIN without the old one.
              The old PIN is stored one-way and cannot be looked up by anyone, including
              support.
            </p>
            <p className="ei-settings-hint">
              This reset is recorded in the estate&apos;s activity log and change history
              with your name and the time.
            </p>

            <div className="ei-field">
              <label htmlFor="ei-pin-new">New admin PIN</label>
              <input
                id="ei-pin-new"
                type={show ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="new-password"
                autoFocus
                required
              />
            </div>
            <div className="ei-field">
              <label htmlFor="ei-pin-confirm">Type it again</label>
              <div className="ei-password-row">
                <input
                  id="ei-pin-confirm"
                  type={show ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary ei-btn-small ei-see-password"
                  onClick={() => setShow((v) => !v)}
                >
                  {show ? 'Hide' : 'See PIN'}
                </button>
              </div>
            </div>

            <p className="ei-settings-hint">
              At least 6 characters, and not something common like 123456 or password.
            </p>
            {error ? <div className="ei-error">{error}</div> : null}
          </div>
          <div className="ei-modal-foot ei-btn-row">
            <button type="submit" className="ei-btn" disabled={busy || !pin || !confirmPin}>
              {busy ? 'Saving…' : 'Save new PIN'}
            </button>
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EstateAdminPinResetModal;
