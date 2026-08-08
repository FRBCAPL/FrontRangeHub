import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { generateHelperPin } from '@shared/utils/estateInventoryConstants.js';
import { EstateSettingsShell } from './EstateSettingsShell';
import { useEstateCase } from './EstateCaseContext';

/**
 * PR-managed helpers — each person gets a login name and unique 6-digit PIN.
 */
const EstateSettingsHelpersModal = ({ open, onClose, onSaved, onChanged }) => {
  const { caseNumber } = useEstateCase();
  const [helpers, setHelpers] = useState([]);
  const [pinByKey, setPinByKey] = useState({});
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState(() => generateHelperPin());
  const [adding, setAdding] = useState(false);
  const [resettingKey, setResettingKey] = useState('');
  const [removingKey, setRemovingKey] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [lastIssued, setLastIssued] = useState(null);

  const refresh = async () => {
    const listResult = await estateInventoryService.listHelpers(caseNumber);
    if (listResult.success) {
      const rows = (listResult.data || []).filter((h) => h.active !== false);
      setHelpers(rows);
    } else if (listResult.error) {
      setError(listResult.error);
    }
  };

  useEffect(() => {
    if (!open) return;
    setNewName('');
    setNewPin(generateHelperPin());
    setAdding(false);
    setResettingKey('');
    setRemovingKey('');
    setError('');
    setInfo('');
    setLastIssued(null);
    refresh();
  }, [open, caseNumber]);

  const handleAdd = async (e) => {
    e?.preventDefault?.();
    const name = newName.trim();
    const pin = (newPin || generateHelperPin()).trim();
    if (name.length < 2) return;
    setAdding(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.addHelper(name, pin, caseNumber);
    setAdding(false);
    if (!result.success) {
      setError(result.error || 'Could not add helper.');
      return;
    }
    const display = result.data?.display_name || name;
    const helperKey = String(result.data?.helper_key || '').trim();
    if (helperKey) {
      setHelpers((prev) => {
        if (prev.some((h) => h.helper_key === helperKey)) return prev;
        return [
          ...prev,
          {
            helper_key: helperKey,
            display_name: display,
            active: true,
            pin_configured: true
          }
        ];
      });
      setPinByKey((prev) => ({
        ...prev,
        [helperKey]: {
          ...(prev[helperKey] || {}),
          helper_key: helperKey,
          display_name: display,
          pin,
          pin_configured: true
        }
      }));
    }
    setLastIssued({ name: display, code: pin });
    setNewName('');
    setNewPin(generateHelperPin());
    setInfo(`Added ${display}. PIN: ${pin}`);
    onSaved?.();
    onChanged?.();
    await refresh();
  };

  const handleResetPin = async (helperKey, label) => {
    const code = generateHelperPin();
    const ok = window.confirm(
      `Generate a new PIN for ${label}?\n\n` +
        `New PIN: ${code}\n\n` +
        'Share the new PIN with them only. Their old PIN will stop working.'
    );
    if (!ok) return;
    setResettingKey(helperKey);
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHelperPin(helperKey, code, caseNumber);
    setResettingKey('');
    if (!result.success) {
      setError(result.error || `Could not set PIN for ${label}.`);
      return;
    }
    setPinByKey((prev) => ({
      ...prev,
      [helperKey]: {
        ...(prev[helperKey] || {}),
        helper_key: helperKey,
        pin: code,
        pin_configured: true
      }
    }));
    setLastIssued({ name: label, code });
    setInfo(`PIN updated for ${label}. New PIN: ${code}`);
    onSaved?.();
  };

  const handleRemove = async (helperKey, label) => {
    const ok = window.confirm(
      `Remove helper ${label}?\n\nThey will no longer be able to sign in. Existing photos they captured stay in the estate.`
    );
    if (!ok) return;
    setRemovingKey(helperKey);
    setError('');
    setInfo('');
    const result = await estateInventoryService.removeHelper(helperKey, caseNumber);
    setRemovingKey('');
    if (!result.success) {
      setError(result.error || `Could not remove ${label}.`);
      return;
    }
    setHelpers((prev) => prev.filter((h) => h.helper_key !== helperKey));
    setInfo(`Removed ${label}.`);
    onSaved?.();
    onChanged?.();
    await refresh();
  };

  const pinStatus = (helperKey) => {
    const row = pinByKey[helperKey];
    if (row?.pin_configured || row?.pin) return 'PIN ready';
    const listed = helpers.find((h) => h.helper_key === helperKey);
    if (listed?.pin_configured) return 'PIN ready';
    return 'Needs PIN';
  };

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title="Helpers"
      titleId="ei-settings-helpers-title"
      wide
      foot={
        <button type="button" className="ei-btn" onClick={onClose}>
          Back
        </button>
      }
    >
      <div className="ei-modal-body">
        <p className="ei-settings-hint">
          Add each inventory assistant with the <strong>name they will type at login</strong> and a
          unique 6-digit <strong>PIN</strong>. They sign in with that exact name + PIN. Photo work
          is stamped with their name. Use <strong>New PIN</strong> if a code is lost or shared
          accidentally.
        </p>

        {lastIssued ? (
          <div className="ei-heir-issued" role="status">
            <strong>{lastIssued.name}</strong>
            <span className="ei-heir-issued-label">PIN</span>
            <code className="ei-heir-issued-code">{lastIssued.code}</code>
            <p className="ei-settings-hint" style={{ margin: '0.35rem 0 0' }}>
              Share this name and PIN with them only. You can also find it later under View
              passwords.
            </p>
          </div>
        ) : null}

        {error ? <div className="ei-error">{error}</div> : null}
        {info ? <p className="ei-settings-hint" role="status">{info}</p> : null}

        <h4 className="ei-settings-subhead">Helpers</h4>
        <div className="ei-heir-list" aria-label="Helpers allowed to capture inventory">
          {helpers.length === 0 ? (
            <p className="ei-settings-hint">No helpers added yet.</p>
          ) : (
            <ul className="ei-heir-ul">
              {helpers.map((h) => {
                const label = h.display_name || h.helper_key;
                return (
                  <li key={h.helper_key} className="ei-heir-row">
                    <div className="ei-heir-row-main">
                      <span className="ei-heir-name">{label}</span>
                      <span className="ei-heir-invite-status">{pinStatus(h.helper_key)}</span>
                    </div>
                    <span className="ei-heir-row-actions">
                      <button
                        type="button"
                        className="ei-btn ei-btn-secondary ei-btn-small"
                        disabled={resettingKey === h.helper_key}
                        onClick={() => handleResetPin(h.helper_key, label)}
                      >
                        {resettingKey === h.helper_key ? 'Saving…' : 'New PIN'}
                      </button>
                      <button
                        type="button"
                        className="ei-btn ei-btn-secondary ei-btn-small"
                        disabled={removingKey === h.helper_key}
                        onClick={() => handleRemove(h.helper_key, label)}
                      >
                        {removingKey === h.helper_key ? 'Removing…' : 'Remove'}
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form className="ei-field ei-heir-add" onSubmit={handleAdd}>
          <h4 className="ei-settings-subhead">Add helper</h4>
          <div className="ei-heir-add-row">
            <input
              id="ei-new-helper"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Login name (e.g. Jordan Lee)"
              autoComplete="off"
              aria-label="Helper login name"
            />
          </div>
          <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
            They must type this name exactly when signing in (capitalization does not matter).
          </p>
          <div className="ei-heir-code-row">
            <div className="ei-heir-code-preview">
              <span className="ei-heir-code-label">PIN (auto)</span>
              <code className="ei-heir-issued-code">{newPin}</code>
            </div>
            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small"
              onClick={() => setNewPin(generateHelperPin())}
            >
              New PIN
            </button>
          </div>
          <button
            type="submit"
            className="ei-btn ei-btn-secondary ei-btn-small"
            disabled={adding || newName.trim().length < 2}
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
    </EstateSettingsShell>
  );
};

export default EstateSettingsHelpersModal;
