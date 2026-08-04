import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estatePricingBlurbShort } from '@shared/utils/estateBilling.js';

/**
 * Create a new estate for the signed-in Google PR.
 */
const EstateCreateEstateModal = ({ open, onClose, onCreated }) => {
  const [estateName, setEstateName] = useState('');
  const [courtCase, setCourtCase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

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
    setCreated(result.data);
  };

  const handleDone = () => {
    const data = created;
    setCreated(null);
    onCreated?.(data);
    onClose?.();
  };

  return (
    <div
      className="ei-modal-backdrop"
      role="presentation"
      onClick={created ? undefined : onClose}
    >
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-create-estate-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-create-estate-title">
            {created ? 'Estate created — save your PIN' : 'Start a new estate'}
          </h3>
          {!created ? (
            <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          ) : null}
        </div>
        {created ? (
          <div className="ei-modal-form">
            <div className="ei-modal-body">
              <p className="ei-settings-hint" style={{ marginTop: 0 }}>
                <strong>{created.estate_name}</strong> is ready. Case number{' '}
                <strong>{created.case_number}</strong> — this is what you, heirs, and helpers
                all use to sign in.
              </p>
              <div className="ei-field">
                <label htmlFor="ei-new-estate-pin">One-time admin PIN</label>
                <input id="ei-new-estate-pin" value={created.admin_password || ''} readOnly />
                <p className="ei-settings-hint">
                  Write this down now — it is shown once. Use it to unlock admin on your first
                  device, then you will be required to replace it. It is not recoverable from the
                  app afterwards.
                </p>
              </div>
            </div>
            <div className="ei-modal-foot ei-btn-row">
              <button type="button" className="ei-btn" onClick={handleDone}>
                I saved the PIN
              </button>
            </div>
          </div>
        ) : (
        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-settings-hint" style={{ marginTop: 0 }}>
              Your signed-in email becomes the <strong>only</strong> primary executor for this
              estate (you can still own multiple estates). Heirs and helpers join later by invite only.
              A one-time admin PIN is generated and shown once after you create the estate.
            </p>
            <p className="ei-settings-hint">
              <strong>Billing:</strong> {estatePricingBlurbShort()}
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
                placeholder="e.g. 25PR09999"
              />
              <p className="ei-settings-hint">
                This becomes the number everyone signs in with, so use the court case number if you
                have it. No two estates may share the same case number. Leave blank and we will
                generate one for you.
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
        )}
      </div>
    </div>
  );
};

export default EstateCreateEstateModal;
