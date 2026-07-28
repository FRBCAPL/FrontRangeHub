import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import EstateSettingsAccessPasswords from './EstateSettingsAccessPasswords';
import { EstateSettingsPasswordField, EstateSettingsShell } from './EstateSettingsShell';
import { useEstateCase } from './EstateCaseContext';

const EstateSettingsHelperPasswordModal = ({ open, onClose, onSaved }) => {
  const { caseNumber } = useEstateCase();
  const [helperPassword, setHelperPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [passRefresh, setPassRefresh] = useState(0);

  useEffect(() => {
    if (!open) return;
    setHelperPassword('');
    setShowPassword(false);
    setSaving(false);
    setError('');
    setInfo('');
    setPassRefresh((k) => k + 1);
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!helperPassword.trim()) {
      setError('Enter a helper password.');
      return;
    }
    setSaving(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHelperPassword(
      helperPassword.trim(),
      caseNumber
    );
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Could not set helper password.');
      return;
    }
    setInfo('Helper password updated.');
    setHelperPassword('');
    setPassRefresh((k) => k + 1);
    onSaved?.();
  };

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title="Helper password"
      titleId="ei-settings-helper-pass-title"
      foot={
        <>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={saving}>
            Back
          </button>
          <button type="submit" form="ei-settings-helper-pass-form" className="ei-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="ei-settings-helper-pass-form" className="ei-modal-form" onSubmit={handleSubmit}>
        <div className="ei-modal-body">
          <p className="ei-settings-hint">
            Shared password for inventory assistants. Helpers can photo and describe items only —
            they cannot set legal status.
          </p>
          <EstateSettingsAccessPasswords refreshKey={passRefresh} compact levels={['helper']} />
          <EstateSettingsPasswordField
            id="ei-helper-pass"
            label="Set / replace helper password"
            value={helperPassword}
            onChange={(e) => setHelperPassword(e.target.value)}
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
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

export default EstateSettingsHelperPasswordModal;
