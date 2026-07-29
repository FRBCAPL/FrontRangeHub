import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';

/**
 * Create a new estate for the signed-in Google PR.
 */
const EstateCreateEstateModal = ({ open, onClose, onCreated }) => {
  const [estateName, setEstateName] = useState('');
  const [courtCase, setCourtCase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result = await estateInventoryService.createOwnedEstate({
      estateName: estateName.trim(),
      courtCaseNumber: courtCase.trim() || null
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not create estate.');
      return;
    }
    setEstateName('');
    setCourtCase('');
    onCreated?.(result.data);
    onClose?.();
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-create-estate-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-create-estate-title">Start a new estate</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-settings-hint" style={{ marginTop: 0 }}>
              Your signed-in email becomes the <strong>only</strong> primary executor for this
              estate (you can still own multiple estates). Heirs and helpers join later by invite only.
              Default admin PIN is <strong>123456</strong> (change it after first unlock).
            </p>
            <div className="ei-field">
              <label htmlFor="ei-new-estate-name">Estate name</label>
              <input
                id="ei-new-estate-name"
                value={estateName}
                onChange={(e) => setEstateName(e.target.value)}
                placeholder="e.g. Estate of Jane Doe"
                required
                minLength={2}
                autoFocus
              />
              <p className="ei-settings-hint">Names may match another estate — the case number keeps them separate.</p>
            </div>
            <div className="ei-field">
              <label htmlFor="ei-new-court-case">Case number (must be unique)</label>
              <input
                id="ei-new-court-case"
                value={courtCase}
                onChange={(e) => setCourtCase(e.target.value)}
                placeholder="e.g. 26PR00440 or TEST0002"
              />
              <p className="ei-settings-hint">
                This is the estate’s identity with the name above. No two estates may share the same
                case number. Leave blank only if you will set it later in Settings.
              </p>
            </div>
            {error ? <div className="ei-error">{error}</div> : null}
          </div>
          <div className="ei-modal-foot ei-btn-row">
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="ei-btn" disabled={busy || estateName.trim().length < 2}>
              {busy ? 'Creating…' : 'Create estate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EstateCreateEstateModal;
