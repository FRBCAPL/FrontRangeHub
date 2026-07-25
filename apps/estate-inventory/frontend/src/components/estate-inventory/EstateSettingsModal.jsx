import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { CASE_NUMBER } from '@shared/utils/estateInventoryConstants.js';

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  autoComplete
}) {
  return (
    <div className="ei-field">
      <label htmlFor={id}>{label}</label>
      <div className="ei-password-row">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small ei-see-password"
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

const EstateSettingsModal = ({ open, onClose, initialSettings, onSaved }) => {
  const [lettersIssuedAt, setLettersIssuedAt] = useState('');
  const [auctionPickupWindow, setAuctionPickupWindow] = useState('');
  const [caseNumber, setCaseNumber] = useState(CASE_NUMBER);
  const [showPasswords, setShowPasswords] = useState({
    adminCurrent: false,
    adminNew: false,
    helper: false,
    heirInvite: false
  });
  const [adminCurrent, setAdminCurrent] = useState('');
  const [adminNew, setAdminNew] = useState('');
  const [helperPassword, setHelperPassword] = useState('');
  const [heirInvitePassword, setHeirInvitePassword] = useState('');
  const [heirAccounts, setHeirAccounts] = useState([]);
  const [newHeirName, setNewHeirName] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingHeir, setAddingHeir] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const refreshHeirs = async () => {
    const result = await estateInventoryService.listSiblingAccounts();
    if (result.success) setHeirAccounts(result.data || []);
  };

  useEffect(() => {
    if (!open) return;
    setLettersIssuedAt(initialSettings?.letters_issued_at || '');
    setAuctionPickupWindow(initialSettings?.auction_pickup_window || '');
    setCaseNumber(initialSettings?.case_number || CASE_NUMBER);
    setShowPasswords({
      adminCurrent: false,
      adminNew: false,
      helper: false,
      heirInvite: false
    });
    setAdminCurrent('');
    setAdminNew('');
    setHelperPassword('');
    setHeirInvitePassword('');
    setNewHeirName('');
    setSaving(false);
    setAddingHeir(false);
    setError('');
    setInfo('');
    refreshHeirs();
  }, [open, initialSettings]);

  if (!open) return null;

  const toggleShow = (key) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddHeir = async (e) => {
    e?.preventDefault?.();
    const name = newHeirName.trim();
    if (name.length < 2) return;
    setAddingHeir(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.addHeir(name);
    setAddingHeir(false);
    if (!result.success) {
      setError(result.error || 'Could not add person.');
      return;
    }
    setNewHeirName('');
    setInfo(`Added ${result.data?.display_name || name} to the family portal list.`);
    await refreshHeirs();
  };

  const handleRenameHeir = async (siblingKey, currentName) => {
    const next = window.prompt('Preferred name for this heir:', currentName || '');
    if (next == null) return;
    const name = next.trim();
    if (name.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    setError('');
    setInfo('');
    const result = await estateInventoryService.renameHeir(siblingKey, name);
    if (!result.success) {
      setError(result.error || 'Could not rename.');
      return;
    }
    setInfo(`Updated name to ${result.data?.display_name || name}.`);
    await refreshHeirs();
  };

  const handleRemoveHeir = async (siblingKey, displayName) => {
    setError('');
    setInfo('');
    const result = await estateInventoryService.removeHeir(siblingKey);
    if (!result.success) {
      setError(result.error || `Could not remove ${displayName}.`);
      return;
    }
    setInfo(`Removed ${displayName}.`);
    await refreshHeirs();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setInfo('');

    const settingsResult = await estateInventoryService.saveSettings({
      lettersIssuedAt: lettersIssuedAt || null,
      caseNumber,
      auctionPickupWindow: auctionPickupWindow || null
    });
    if (!settingsResult.success) {
      setSaving(false);
      setError(settingsResult.error || 'Could not save settings.');
      return;
    }

    if (adminNew.trim()) {
      const adminResult = await estateInventoryService.setAdminPassword(
        adminCurrent.trim() || '123456',
        adminNew.trim()
      );
      if (!adminResult.success) {
        setSaving(false);
        setError(adminResult.error || 'Could not change admin password.');
        return;
      }
    }

    if (helperPassword.trim()) {
      const helperResult = await estateInventoryService.setHelperPassword(helperPassword.trim());
      if (!helperResult.success) {
        setSaving(false);
        setError(helperResult.error || 'Could not set helper password.');
        return;
      }
    }

    if (heirInvitePassword.trim()) {
      const heirResult = await estateInventoryService.setHeirInvitePassword(heirInvitePassword.trim());
      if (!heirResult.success) {
        setSaving(false);
        setError(heirResult.error || 'Could not set heir invite password.');
        return;
      }
    }

    setSaving(false);
    setInfo('Settings saved.');
    onSaved?.(settingsResult.data);
    setAdminCurrent('');
    setAdminNew('');
    setHelperPassword('');
    setHeirInvitePassword('');
    setShowPasswords({
      adminCurrent: false,
      adminNew: false,
      helper: false,
      heirInvite: false
    });
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-settings-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-settings-title">Estate settings</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="ei-modal-form" onSubmit={handleSubmit}>
          <div className="ei-modal-body">
            <p className="ei-settings-intro">
              Scroll for passwords and heirs. Close and Save stay pinned at the bottom.
            </p>

            <div className="ei-field">
              <label htmlFor="ei-case-number">Case number</label>
              <input
                id="ei-case-number"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
              />
              <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
                Only the Executor / Personal Representative can change this.
              </p>
            </div>
            <div className="ei-field">
              <label htmlFor="ei-letters-date">Letters issued date</label>
              <input
                id="ei-letters-date"
                type="date"
                value={lettersIssuedAt || ''}
                onChange={(e) => setLettersIssuedAt(e.target.value)}
              />
            </div>
            <div className="ei-field">
              <label htmlFor="ei-pickup-window">Auction pickup window</label>
              <input
                id="ei-pickup-window"
                value={auctionPickupWindow}
                onChange={(e) => setAuctionPickupWindow(e.target.value)}
                placeholder="e.g. May 15–18, 2026 (weekends only)"
              />
              <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
                Shown in the public auction Terms of Sale. Leave blank until dates are set.
              </p>
            </div>

            <h4 className="ei-settings-subhead">Executor / PR password</h4>
            <p className="ei-settings-hint">
              Default is <strong>123456</strong> until changed. Leave new blank to keep current.
            </p>
            <PasswordField
              id="ei-admin-current"
              label="Current password"
              value={adminCurrent}
              onChange={(e) => setAdminCurrent(e.target.value)}
              visible={showPasswords.adminCurrent}
              onToggle={() => toggleShow('adminCurrent')}
              placeholder="123456 if never changed"
              autoComplete="current-password"
            />
            <PasswordField
              id="ei-admin-new"
              label="New password"
              value={adminNew}
              onChange={(e) => setAdminNew(e.target.value)}
              visible={showPasswords.adminNew}
              onToggle={() => toggleShow('adminNew')}
              placeholder="Min 6 characters"
              autoComplete="new-password"
            />

            <h4 className="ei-settings-subhead">Helper password</h4>
            <p className="ei-settings-hint">
              Shared password for assistants. They cannot set legal status.
            </p>
            <PasswordField
              id="ei-helper-pass"
              label="Set / replace helper password"
              value={helperPassword}
              onChange={(e) => setHelperPassword(e.target.value)}
              visible={showPasswords.helper}
              onToggle={() => toggleShow('helper')}
              placeholder="Min 6 characters"
              autoComplete="new-password"
            />

            <h4 className="ei-settings-subhead">Family / heir portal</h4>
            <p className="ei-settings-hint">
              Add whoever should have Family portal access for this estate (any names). Set one shared
              invite password. They sign in with <strong>their name</strong> + invite password, then set
              their own password. Admin, helper, and case-number tools stay hidden on their routes.
            </p>
            <PasswordField
              id="ei-heir-invite"
              label="Shared heir invite password"
              value={heirInvitePassword}
              onChange={(e) => setHeirInvitePassword(e.target.value)}
              visible={showPasswords.heirInvite}
              onToggle={() => toggleShow('heirInvite')}
              placeholder="Min 6 characters — leave blank to keep current"
              autoComplete="new-password"
            />

            <div className="ei-heir-list" aria-label="People allowed in family portal">
              {heirAccounts.length === 0 ? (
                <p className="ei-settings-hint">No heirs added yet.</p>
              ) : (
                <ul className="ei-heir-ul">
                  {heirAccounts.map((h) => (
                    <li key={h.sibling_key} className="ei-heir-row">
                      <span>{h.display_name}</span>
                      <span className="ei-heir-row-actions">
                        <button
                          type="button"
                          className="ei-btn ei-btn-secondary ei-btn-small"
                          onClick={() => handleRenameHeir(h.sibling_key, h.display_name)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="ei-btn ei-btn-secondary ei-btn-small"
                          onClick={() => handleRemoveHeir(h.sibling_key, h.display_name)}
                        >
                          Remove
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="ei-field ei-heir-add">
              <label htmlFor="ei-new-heir">Add person</label>
              <div className="ei-password-row">
                <input
                  id="ei-new-heir"
                  value={newHeirName}
                  onChange={(e) => setNewHeirName(e.target.value)}
                  placeholder="e.g. Matthew"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary ei-btn-small"
                  disabled={addingHeir || newHeirName.trim().length < 2}
                  onClick={handleAddHeir}
                >
                  {addingHeir ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>

            {error ? <div className="ei-error">{error}</div> : null}
            {info ? <p className="ei-status">{info}</p> : null}
          </div>

          <div className="ei-modal-foot ei-btn-row">
            <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={saving}>
              Close
            </button>
            <button type="submit" className="ei-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EstateSettingsModal;
