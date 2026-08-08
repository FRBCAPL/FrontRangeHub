import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estateDisplayCaseNumber } from '@shared/utils/estateInventoryConstants.js';
import {
  isCommonEstatePassword,
  commonEstatePasswordMessage
} from '@shared/utils/estatePasswordPolicy.js';
import { useEstateCase } from './EstateCaseContext';
import './EstateInventoryApp.css';

/**
 * Returns the first reason the new password can't be saved yet, or '' when ready.
 * Only checks fields the user has started filling so it doesn't nag prematurely.
 */
function newPasswordIssue({ current, next, confirm }) {
  if (!next) return '';
  if (next.length < 6) return 'New password must be at least 6 characters.';
  if (isCommonEstatePassword(next)) {
    return commonEstatePasswordMessage();
  }
  if (current && next === current) {
    return 'Choose a password different from the starter PIN.';
  }
  if (confirm && next !== confirm) {
    return 'New password and confirmation do not match.';
  }
  if (!confirm) return '';
  return '';
}

/**
 * Blocks the admin dashboard until the one-time starter PIN is replaced.
 */
const ForceAdminPasswordModal = ({ open, onComplete }) => {
  const { caseNumber } = useEstateCase();
  const [caseLabel, setCaseLabel] = useState(caseNumber);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      const settings = await estateInventoryService.getSettings(caseNumber);
      if (cancelled || !settings.success) return;
      setCaseLabel(estateDisplayCaseNumber(settings.data, caseNumber));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, caseNumber]);

  if (!open) return null;

  const liveIssue = newPasswordIssue({
    current: currentPassword,
    next: nextPassword,
    confirm: confirmPassword
  });
  const canSubmit =
    Boolean(currentPassword) &&
    Boolean(nextPassword) &&
    Boolean(confirmPassword) &&
    !liveIssue &&
    !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const issue = newPasswordIssue({
      current: currentPassword,
      next: nextPassword,
      confirm: confirmPassword
    });
    if (issue) {
      setError(issue);
      return;
    }
    if (!confirmPassword) {
      setError('Confirm your new password.');
      return;
    }
    setBusy(true);
    const result = await estateInventoryService.setAdminPassword(
      currentPassword,
      nextPassword,
      caseNumber
    );
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not update password.');
      return;
    }
    onComplete?.();
  };

  const modal = (
    <div className="ei-force-pwd-screen" role="presentation">
      <div
        className="ei-modal ei-force-pwd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-force-pwd-title"
      >
        <div className="ei-modal-head">
          <h3 id="ei-force-pwd-title">Set a new admin PIN</h3>
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-force-pwd-warning">
              Case <strong>{caseLabel}</strong> is still using its one-time starter PIN. Pick a new
              admin PIN (6+ characters) that only you know — this is also the credential that reveals
              helper and heir access codes.
            </p>
            <div className="ei-field">
              <label htmlFor="force-cur">Current (starter) PIN</label>
              <input
                id="force-cur"
                type={show ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="ei-field">
              <label htmlFor="force-new">New admin PIN</label>
              <input
                id="force-new"
                type={show ? 'text' : 'password'}
                value={nextPassword}
                onChange={(e) => setNextPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                aria-invalid={Boolean(liveIssue)}
                aria-describedby="force-new-help"
              />
              {liveIssue ? (
                <p id="force-new-help" className="ei-field-hint ei-field-hint--warn">
                  {liveIssue}
                </p>
              ) : (
                <p id="force-new-help" className="ei-field-hint">
                  At least 6 characters. Avoid common codes like 123456.
                </p>
              )}
            </div>
            <div className="ei-field">
              <label htmlFor="force-confirm">Confirm new password</label>
              <input
                id="force-confirm"
                type={show ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small"
              onClick={() => setShow((v) => !v)}
            >
              {show ? 'Hide passwords' : 'Show passwords'}
            </button>
            {error ? <div className="ei-error">{error}</div> : null}
          </div>
          <div className="ei-modal-foot ei-btn-row">
            <button type="submit" className="ei-btn" disabled={!canSubmit}>
              {busy ? 'Saving…' : 'Save password & continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
};

export default ForceAdminPasswordModal;
