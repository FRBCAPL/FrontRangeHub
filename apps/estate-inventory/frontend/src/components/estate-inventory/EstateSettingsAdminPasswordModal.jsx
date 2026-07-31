import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { EstateSettingsPasswordField, EstateSettingsShell } from './EstateSettingsShell';
import { useEstateCase } from './EstateCaseContext';

const EstateSettingsAdminPasswordModal = ({ open, onClose, onSaved }) => {
  const { caseNumber } = useEstateCase();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [passRefresh, setPassRefresh] = useState(0);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword('');
    setNewPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setSaving(false);
    setError('');
    setInfo('');
    setPassRefresh((k) => k + 1);
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setError('Enter a new admin PIN.');
      return;
    }
    if (!currentPassword.trim()) {
      setError('Enter the current admin PIN.');
      return;
    }
    setSaving(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.setAdminPassword(
      currentPassword.trim(),
      newPassword.trim(),
      caseNumber
    );
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Could not change the admin PIN.');
      return;
    }
    setInfo('Admin PIN updated.');
    setCurrentPassword('');
    setNewPassword('');
    setPassRefresh((k) => k + 1);
    onSaved?.();
  };

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title="Admin PIN"
      titleId="ei-settings-admin-pass-title"
      foot={
        <>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={saving}>
            Back
          </button>
          <button type="submit" form="ei-settings-admin-pass-form" className="ei-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="ei-settings-admin-pass-form" className="ei-modal-form" onSubmit={handleSubmit}>
        <div className="ei-modal-body">
          <p className="ei-settings-hint">
            This unlocks the Estate Vault admin portal for this case. It is also the credential that
            reveals helper and heir access codes, so keep it private and do not reuse it as the
            helper password.
          </p>
          <EstateSettingsPasswordField
            id="ei-admin-current"
            label="Current admin PIN"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            visible={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            placeholder="Current admin PIN"
            autoComplete="current-password"
          />
          <EstateSettingsPasswordField
            id="ei-admin-new"
            label="New admin PIN"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            visible={showNew}
            onToggle={() => setShowNew((v) => !v)}
            placeholder="Min 6 characters"
            autoComplete="new-password"
          />
          {error ? <div className="ei-error">{error}</div> : null}
          {info ? <p className="ei-status">{info}</p> : null}
        </div>
      </form>
    </EstateSettingsShell>
  );
};

export default EstateSettingsAdminPasswordModal;
