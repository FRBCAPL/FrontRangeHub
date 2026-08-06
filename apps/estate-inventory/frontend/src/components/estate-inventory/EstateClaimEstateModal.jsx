import React, { useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';

/**
 * Link an existing case to the signed-in Google PR via admin PIN.
 */
const EstateClaimEstateModal = ({ open, onClose, onClaimed }) => {
  const [caseNumber, setCaseNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result = await estateInventoryService.claimOwnedEstate({
      caseNumber: caseNumber.trim(),
      password
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not claim estate.');
      return;
    }
    setCaseNumber('');
    setPassword('');
    onClaimed?.(result.data);
    onClose?.();
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-claim-estate-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-claim-estate-title">Link an existing estate</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form className="ei-modal-form" onSubmit={handleSubmit} autoComplete="off">
          <div className="ei-modal-body">
            <p className="ei-settings-hint" style={{ marginTop: 0 }}>
              Use this once per estate to set <strong>your account email</strong> as the sole primary
              executor. Enter the portal case number and the <strong>admin PIN</strong> you already
              use. If another email is already linked, claim is blocked — each estate has only one PR
              email. Inventory and invites stay in place.
            </p>
            <div className="ei-field">
              <label htmlFor="ei-claim-case">Case number</label>
              <input
                id="ei-claim-case"
                name="estate_vault_claim_case"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="e.g. 25PR09999"
                required
                autoFocus
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
              />
            </div>
            <div className="ei-field">
              <label htmlFor="ei-claim-pass">Admin PIN</label>
              <div className="ei-password-row">
                <input
                  id="ei-claim-pass"
                  name="estate_vault_claim_pin"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                />
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary ei-btn-small ei-see-password"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Hide' : 'See'}
                </button>
              </div>
            </div>
            {error ? <div className="ei-error">{error}</div> : null}
          </div>
          <div className="ei-modal-foot ei-btn-row">
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className="ei-btn"
              disabled={busy || !caseNumber.trim() || !password}
            >
              {busy ? 'Linking…' : 'Link to my account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EstateClaimEstateModal;
