import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';

/**
 * Heir sets / changes their personal password after invite login.
 * First-time (required): new password only — already signed in with invite.
 * Later changes: current + new password.
 */
const HeirChangePasswordModal = ({ open, required = false, onClose, onChanged }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShow(false);
    setBusy(false);
    setError('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.trim().length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await estateInventoryService.heirChangePassword(
      required ? '' : currentPassword.trim(),
      newPassword.trim()
    );
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not change password.');
      return;
    }
    onChanged?.();
    if (!required) onClose?.();
  };

  return (
    <div
      className="ei-modal-backdrop"
      role="presentation"
      onClick={required ? undefined : onClose}
    >
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-heir-pwd-title"
        onClick={(ev) => ev.stopPropagation()}
        style={{ height: 'auto', maxHeight: 'min(88vh, 88dvh)' }}
      >
        <div className="ei-modal-head">
          <h3 id="ei-heir-pwd-title">
            {required ? 'Set your password' : 'Change password'}
          </h3>
          {!required ? (
            <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          ) : null}
        </div>

        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-settings-intro">
              {required
                ? 'Choose a personal password for next time. You already signed in with the invite password.'
                : 'Update the password you use with your name on this portal.'}
            </p>
            {!required ? (
              <div className="ei-field">
                <label htmlFor="ei-heir-cur">Current password</label>
                <input
                  id="ei-heir-cur"
                  type={show ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            ) : null}
            <div className="ei-field">
              <label htmlFor="ei-heir-new">New password</label>
              <input
                id="ei-heir-new"
                type={show ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Min 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="ei-field">
              <label htmlFor="ei-heir-confirm">Confirm new password</label>
              <input
                id="ei-heir-confirm"
                type={show ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
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
            {error ? <div className="ei-error" style={{ marginTop: '0.75rem' }}>{error}</div> : null}
          </div>
          <div className="ei-modal-foot ei-btn-row">
            {!required ? (
              <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
                Cancel
              </button>
            ) : null}
            <button type="submit" className="ei-btn" disabled={busy}>
              {busy ? 'Saving…' : required ? 'Save password' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HeirChangePasswordModal;
