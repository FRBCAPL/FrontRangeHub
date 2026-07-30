import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { purgeTestUser } from '@shared/services/estateSuperAdminService.js';

/**
 * Hard-purge Estate Vault data for a test owner.
 * Never deletes the shared Supabase Auth / Hub login.
 */
const EstateSuperPurgeUserModal = ({ owner, open, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [phrase, setPhrase] = useState('');
  const [confirmedTest, setConfirmedTest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const email = String(owner?.owner_email || '').trim().toLowerCase();
  const expected = useMemo(
    () => (email ? `DELETE EV TEST USER ${email.toUpperCase()}` : ''),
    [email]
  );

  if (!open || !owner) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!confirmedTest) {
      setError('Confirm that this account and every listed estate are test data.');
      return;
    }
    if (reason.trim().length < 8) {
      setError('Reason must be at least 8 characters.');
      return;
    }
    if (phrase.trim().toUpperCase() !== expected) {
      setError(`Type exactly: ${expected}`);
      return;
    }
    setBusy(true);
    const result = await purgeTestUser({
      userId: owner.owner_id,
      email,
      reason: reason.trim(),
      confirmPhrase: phrase.trim()
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Purge failed.');
      return;
    }
    onDone?.(result.data);
    onClose?.();
  };

  const modal = (
    <div className="ei-force-pwd-screen" role="presentation">
      <div className="ei-modal ei-super-purge-modal" role="dialog" aria-modal="true">
        <div className="ei-modal-head">
          <h3>Delete EV test user</h3>
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-force-pwd-warning">
              Permanently deletes <strong>Estate Vault</strong> data for{' '}
              <strong>{email || owner.owner_id}</strong>
              {owner.estate_count ? ` (${owner.estate_count} test estate(s))` : ''}, after writing a
              sealed archive.
            </p>
            <p className="ei-settings-hint">
              The Google / email login and all other apps stay intact. This only removes Estate Vault
              rows and EV photo/export storage for this user.
            </p>
            <label className="ei-checkbox-row">
              <input
                type="checkbox"
                checked={confirmedTest}
                onChange={(e) => setConfirmedTest(e.target.checked)}
              />
              <span>
                I confirm this is a test account and all {owner.estate_count || 0} estate(s) shown
                for it are test data. Mark them as test and delete them in this one operation.
              </span>
            </label>
            <div className="ei-field">
              <label htmlFor="super-purge-user-reason">Reason (required)</label>
              <textarea
                id="super-purge-user-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="ei-field">
              <label htmlFor="super-purge-user-phrase">Type {expected}</label>
              <input
                id="super-purge-user-phrase"
                type="text"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            {error ? <div className="ei-error">{error}</div> : null}
          </div>
          <div className="ei-modal-foot ei-btn-row">
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className="ei-btn ei-btn-danger"
              disabled={busy || !confirmedTest}
            >
              {busy ? 'Deleting EV data…' : 'Delete EV data permanently'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
};

export default EstateSuperPurgeUserModal;
