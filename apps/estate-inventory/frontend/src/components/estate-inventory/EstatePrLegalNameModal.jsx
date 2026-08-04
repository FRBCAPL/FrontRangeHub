import React, { useEffect, useState } from 'react';
import { setPrLegalName } from '@shared/services/estatePrIdentityService.js';

/**
 * First-run gate: PR enters account-wide legal (fiduciary) name once.
 */
const EstatePrLegalNameModal = ({ open, required = false, initialName = '', onSaved }) => {
  const [name, setName] = useState(initialName || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(initialName || '');
    setBusy(false);
    setError('');
  }, [open, initialName]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Enter your legal name (at least 2 characters).');
      return;
    }
    setBusy(true);
    setError('');
    const result = await setPrLegalName(trimmed);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save legal name.');
      return;
    }
    onSaved?.(result.data);
  };

  return (
    <div className="ei-modal-backdrop ei-force-pwd-backdrop" role="presentation">
      <div
        className="ei-modal ei-force-pwd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-pr-legal-name-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-pr-legal-name-title">Your legal name as Personal Representative</h3>
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <p className="ei-settings-hint">
            Enter the name you use in court records and fiduciary paperwork. This applies to all
            estates on this account and appears on exports as the primary representative.
            {required ? ' You must set this before creating or opening estates.' : ''}
          </p>
          <div className="ei-field">
            <label htmlFor="ei-pr-legal-name">Legal name</label>
            <input
              id="ei-pr-legal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Jane Q. Public"
            />
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          <button type="submit" className="ei-btn" disabled={busy || name.trim().length < 2}>
            {busy ? 'Saving…' : 'Save & continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EstatePrLegalNameModal;
