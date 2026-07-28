import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { DEFAULT_ADMIN_PASSWORD } from '@shared/utils/estateInventoryConstants.js';
import './EstateInventoryApp.css';

/**
 * Blocks admin dashboard until default password 123456 is replaced.
 */
const ForceAdminPasswordModal = ({ open, onComplete }) => {
  const [currentPassword, setCurrentPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (nextPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (nextPassword === DEFAULT_ADMIN_PASSWORD) {
      setError('Choose a password other than the default 123456.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    const result = await estateInventoryService.setAdminPassword(currentPassword, nextPassword);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not update password.');
      return;
    }
    onComplete?.();
  };

  return (
    <div className="ei-modal-backdrop ei-force-pwd-backdrop" role="presentation">
      <div
        className="ei-modal ei-modal-settings ei-force-pwd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-force-pwd-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-force-pwd-title">Set a secure admin password</h3>
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-force-pwd-warning">
              You are still using the default password <strong>{DEFAULT_ADMIN_PASSWORD}</strong>.
              Change it before managing the inventory.
            </p>
            <div className="ei-field">
              <label htmlFor="force-cur">Current password</label>
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
              <label htmlFor="force-new">New password</label>
              <input
                id="force-new"
                type={show ? 'text' : 'password'}
                value={nextPassword}
                onChange={(e) => setNextPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
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
            <button type="submit" className="ei-btn" disabled={busy}>
              {busy ? 'Saving…' : 'Save password & continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForceAdminPasswordModal;
