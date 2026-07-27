import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  HEIR_ACCESS_TIER,
  HEIR_ACCESS_TIER_OPTIONS,
  normalizeHeirAccessTier
} from '@shared/utils/estateInventoryConstants.js';
import EstateSettingsAccessPasswords from './EstateSettingsAccessPasswords';
import { EstateSettingsPasswordField, EstateSettingsShell } from './EstateSettingsShell';

const EstateSettingsHeirsModal = ({ open, onClose, onInvitePasswordSaved }) => {
  const [heirInvitePassword, setHeirInvitePassword] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [heirAccounts, setHeirAccounts] = useState([]);
  const [newHeirName, setNewHeirName] = useState('');
  const [newHeirTier, setNewHeirTier] = useState(HEIR_ACCESS_TIER.residual);
  const [savingInvite, setSavingInvite] = useState(false);
  const [addingHeir, setAddingHeir] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [passRefresh, setPassRefresh] = useState(0);

  const refreshHeirs = async () => {
    const result = await estateInventoryService.listSiblingAccounts();
    if (result.success) setHeirAccounts(result.data || []);
  };

  useEffect(() => {
    if (!open) return;
    setHeirInvitePassword('');
    setShowInvite(false);
    setNewHeirName('');
    setNewHeirTier(HEIR_ACCESS_TIER.residual);
    setSavingInvite(false);
    setAddingHeir(false);
    setError('');
    setInfo('');
    setPassRefresh((k) => k + 1);
    refreshHeirs();
  }, [open]);

  const handleSaveInvite = async (e) => {
    e.preventDefault();
    if (!heirInvitePassword.trim()) {
      setError('Enter an invite password to save, or leave this section and manage people below.');
      return;
    }
    setSavingInvite(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHeirInvitePassword(heirInvitePassword.trim());
    setSavingInvite(false);
    if (!result.success) {
      setError(result.error || 'Could not set heir invite password.');
      return;
    }
    setInfo('Shared invite password updated.');
    setHeirInvitePassword('');
    setPassRefresh((k) => k + 1);
    onInvitePasswordSaved?.();
  };

  const handleAddHeir = async (e) => {
    e?.preventDefault?.();
    const name = newHeirName.trim();
    if (name.length < 2) return;
    setAddingHeir(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.addHeir(name, newHeirTier);
    setAddingHeir(false);
    if (!result.success) {
      setError(result.error || 'Could not add person.');
      return;
    }
    setNewHeirName('');
    setNewHeirTier(HEIR_ACCESS_TIER.residual);
    setInfo(`Added ${result.data?.display_name || name}.`);
    await refreshHeirs();
  };

  const handleHeirTierChange = async (siblingKey, displayName, nextTier) => {
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHeirAccessTier(siblingKey, nextTier);
    if (!result.success) {
      setError(result.error || `Could not update access for ${displayName}.`);
      await refreshHeirs();
      return;
    }
    setHeirAccounts((prev) =>
      prev.map((h) =>
        h.sibling_key === siblingKey
          ? { ...h, access_tier: normalizeHeirAccessTier(nextTier) }
          : h
      )
    );
    setInfo(`Updated access for ${displayName}.`);
  };

  const handleRenameHeir = async (siblingKey, currentName) => {
    const next = window.prompt('Preferred name for this person:', currentName || '');
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

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title="Family / heirs"
      titleId="ei-settings-heirs-title"
      wide
      foot={
        <button type="button" className="ei-btn" onClick={onClose}>
          Back
        </button>
      }
    >
      <div className="ei-modal-body">
        <p className="ei-settings-hint">
          Residual heirs see the full inventory. Memorandum-only users see items named for them
          (view only). Use the same name as on memorandum items (e.g. Desiree Garcia).
        </p>

        <form className="ei-settings-heirs-invite" onSubmit={handleSaveInvite}>
          <h4 className="ei-settings-subhead">Shared invite password</h4>
          <EstateSettingsAccessPasswords refreshKey={passRefresh} compact levels={['heir']} />
          <EstateSettingsPasswordField
            id="ei-heir-invite"
            label="Set / replace invite password"
            value={heirInvitePassword}
            onChange={(e) => setHeirInvitePassword(e.target.value)}
            visible={showInvite}
            onToggle={() => setShowInvite((v) => !v)}
            placeholder="Min 6 characters"
            autoComplete="new-password"
          />
          <button
            type="submit"
            className="ei-btn ei-btn-secondary ei-btn-small"
            disabled={savingInvite || !heirInvitePassword.trim()}
          >
            {savingInvite ? 'Saving…' : 'Save invite password'}
          </button>
        </form>

        <h4 className="ei-settings-subhead">People</h4>
        <div className="ei-heir-list" aria-label="People allowed in family portal">
          {heirAccounts.length === 0 ? (
            <p className="ei-settings-hint">No people added yet.</p>
          ) : (
            <ul className="ei-heir-ul">
              {heirAccounts.map((h) => (
                <li key={h.sibling_key} className="ei-heir-row">
                  <div className="ei-heir-row-main">
                    <span className="ei-heir-name">{h.display_name}</span>
                    <label className="ei-heir-tier-label" htmlFor={`ei-tier-${h.sibling_key}`}>
                      Access
                      <select
                        id={`ei-tier-${h.sibling_key}`}
                        className="ei-heir-tier-select"
                        value={normalizeHeirAccessTier(h.access_tier)}
                        onChange={(e) =>
                          handleHeirTierChange(h.sibling_key, h.display_name, e.target.value)
                        }
                      >
                        {HEIR_ACCESS_TIER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
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
          <div className="ei-heir-add-row">
            <input
              id="ei-new-heir"
              value={newHeirName}
              onChange={(e) => setNewHeirName(e.target.value)}
              placeholder="e.g. Desiree Garcia"
              autoComplete="off"
            />
            <select
              id="ei-new-heir-tier"
              aria-label="Access type"
              value={newHeirTier}
              onChange={(e) => setNewHeirTier(e.target.value)}
            >
              {HEIR_ACCESS_TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
    </EstateSettingsShell>
  );
};

export default EstateSettingsHeirsModal;
