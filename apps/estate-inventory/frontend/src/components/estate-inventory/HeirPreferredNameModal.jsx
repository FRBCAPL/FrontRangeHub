import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';

/**
 * First-run (and optional later) modal for heir-chosen public name.
 */
const HeirPreferredNameModal = ({ open, required = false, initialName = '', onClose, onSaved }) => {
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
      setError('Enter a name (at least 2 characters).');
      return;
    }
    setBusy(true);
    setError('');
    const result = await estateInventoryService.setPreferredName(trimmed);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save name.');
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
        aria-labelledby="ei-preferred-name-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-preferred-name-title">
            {required ? 'Choose the name others will see' : 'Update your display name'}
          </h3>
          {!required ? (
            <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          ) : null}
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <p className="ei-settings-hint">
            This is how you appear on item requests and to other family members. The Personal
            Representative still keeps their own label for you in estate records.
          </p>
          <div className="ei-field">
            <label htmlFor="ei-preferred-name">Your name in the app</label>
            <input
              id="ei-preferred-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
              autoFocus
              required
              minLength={2}
              maxLength={80}
              placeholder="e.g. Alex"
            />
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          <button type="submit" className="ei-btn" disabled={busy || name.trim().length < 2}>
            {busy ? 'Saving…' : 'Save name & continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HeirPreferredNameModal;
