import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  HEIR_ACCESS_TIER,
  HEIR_ACCESS_TIER_OPTIONS,
  generateHeirInviteCode,
  normalizeHeirAccessTier,
  heirAdminLabel,
  heirPublicName
} from '@shared/utils/estateInventoryConstants.js';
import { EstateSettingsShell } from './EstateSettingsShell';
import { useEstateCase } from './EstateCaseContext';

const EstateSettingsHeirsModal = ({ open, onClose, onInvitePasswordSaved }) => {
  const { caseNumber } = useEstateCase();
  const [heirAccounts, setHeirAccounts] = useState([]);
  const [inviteByKey, setInviteByKey] = useState({});
  const [newHeirName, setNewHeirName] = useState('');
  const [newHeirTier, setNewHeirTier] = useState(HEIR_ACCESS_TIER.residual);
  const [newHeirInvite, setNewHeirInvite] = useState(() => generateHeirInviteCode());
  const [addingHeir, setAddingHeir] = useState(false);
  const [resettingKey, setResettingKey] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [lastIssued, setLastIssued] = useState(null);

  const refreshHeirs = async () => {
    const [listResult, passResult] = await Promise.all([
      estateInventoryService.listSiblingAccounts(caseNumber),
      estateInventoryService.getAccessPasswords(caseNumber)
    ]);
    if (listResult.success) setHeirAccounts(listResult.data || []);
    if (passResult.success) {
      const map = {};
      (passResult.data?.heirs || []).forEach((h) => {
        if (h?.sibling_key) map[h.sibling_key] = h;
      });
      setInviteByKey(map);
    }
  };

  useEffect(() => {
    if (!open) return;
    setNewHeirName('');
    setNewHeirTier(HEIR_ACCESS_TIER.residual);
    setNewHeirInvite(generateHeirInviteCode());
    setAddingHeir(false);
    setResettingKey('');
    setError('');
    setInfo('');
    setLastIssued(null);
    refreshHeirs();
  }, [open]);

  const handleAddHeir = async (e) => {
    e?.preventDefault?.();
    const name = newHeirName.trim();
    const invite = (newHeirInvite || generateHeirInviteCode()).trim();
    if (name.length < 2) return;
    setAddingHeir(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.addHeir(name, newHeirTier, invite, caseNumber);
    setAddingHeir(false);
    if (!result.success) {
      setError(result.error || 'Could not add person.');
      return;
    }
    const display = result.data?.display_name || name;
    const siblingKey = String(result.data?.sibling_key || '').trim();
    if (siblingKey) {
      const optimistic = {
        sibling_key: siblingKey,
        display_name: display,
        preferred_name: result.data?.preferred_name || null,
        access_tier: result.data?.access_tier || newHeirTier,
        updated_at: result.data?.updated_at || new Date().toISOString()
      };
      setHeirAccounts((prev) => {
        if (prev.some((h) => h.sibling_key === siblingKey)) return prev;
        return [...prev, optimistic];
      });
      setInviteByKey((prev) => ({
        ...prev,
        [siblingKey]: {
          ...(prev[siblingKey] || {}),
          sibling_key: siblingKey,
          invite_password: invite
        }
      }));
    }
    setLastIssued({ name: display, code: invite });
    setNewHeirName('');
    setNewHeirTier(HEIR_ACCESS_TIER.residual);
    setNewHeirInvite(generateHeirInviteCode());
    setInfo(`Added ${display}. PIN: ${invite}`);
    onInvitePasswordSaved?.();
    await refreshHeirs();
  };

  const handleResetInvite = async (siblingKey, label) => {
    const code = generateHeirInviteCode();
    const ok = window.confirm(
      `Generate a new PIN for ${label}?\n\n` +
        `New PIN: ${code}\n\n` +
        'Share the new PIN with them only. Their old PIN will stop working.'
    );
    if (!ok) return;
    setResettingKey(siblingKey);
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHeirPersonInvitePassword(
      siblingKey,
      code,
      caseNumber
    );
    setResettingKey('');
    if (!result.success) {
      setError(result.error || `Could not set PIN for ${label}.`);
      return;
    }
    setLastIssued({ name: label, code });
    setInfo(`PIN updated for ${label}. New PIN: ${code}`);
    onInvitePasswordSaved?.();
    await refreshHeirs();
  };

  const handleHeirTierChange = async (siblingKey, label, nextTier) => {
    setError('');
    setInfo('');
    const result = await estateInventoryService.setHeirAccessTier(
      siblingKey,
      nextTier,
      caseNumber
    );
    if (!result.success) {
      setError(result.error || `Could not update access for ${label}.`);
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
    setInfo(`Updated access for ${label}.`);
  };

  const handleRenameHeir = async (siblingKey, currentName) => {
    const next = window.prompt('Admin label for this person (your record name):', currentName || '');
    if (next == null) return;
    const name = next.trim();
    if (name.length < 2) {
      setError('Admin label must be at least 2 characters.');
      return;
    }
    setError('');
    setInfo('');
    const result = await estateInventoryService.renameHeir(siblingKey, name, caseNumber);
    if (!result.success) {
      setError(result.error || 'Could not rename.');
      return;
    }
    setInfo(`Updated admin label to ${result.data?.display_name || name}.`);
    await refreshHeirs();
  };

  const handleRemoveHeir = async (siblingKey, label) => {
    setError('');
    setInfo('');
    const result = await estateInventoryService.removeHeir(siblingKey, caseNumber);
    if (!result.success) {
      setError(result.error || `Could not remove ${label}.`);
      return;
    }
    setInfo(`Removed ${label}.`);
    await refreshHeirs();
  };

  const inviteStatus = (siblingKey) => {
    const row = inviteByKey[siblingKey];
    if (!row) return 'PIN not loaded';
    if (row.invite_configured) return 'PIN ready';
    return 'Needs PIN';
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
          Add each person with an <strong>admin label</strong> (your record / memorandum name) and a
          unique 6-digit <strong>PIN</strong>. They sign in with that PIN only (they cannot change
          it), then choose the name family sees in the app. If they lose their PIN, use{' '}
          <strong>New PIN</strong> here and share the new one.
        </p>

        {lastIssued ? (
          <div className="ei-heir-issued" role="status">
            <strong>{lastIssued.name}</strong>
            <span className="ei-heir-issued-label">PIN</span>
            <code className="ei-heir-issued-code">{lastIssued.code}</code>
            <p className="ei-settings-hint" style={{ margin: '0.35rem 0 0' }}>
              Share this PIN with them only. You can also find it later under View passwords.
            </p>
          </div>
        ) : null}

        <h4 className="ei-settings-subhead">People</h4>
        <div className="ei-heir-list" aria-label="People allowed in family portal">
          {heirAccounts.length === 0 ? (
            <p className="ei-settings-hint">No people added yet.</p>
          ) : (
            <ul className="ei-heir-ul">
              {heirAccounts.map((h) => {
                const adminLabel = heirAdminLabel(h);
                const publicName = heirPublicName(h);
                const preferred = String(h.preferred_name || '').trim();
                return (
                  <li key={h.sibling_key} className="ei-heir-row">
                    <div className="ei-heir-row-main">
                      <span className="ei-heir-name">{adminLabel}</span>
                      <span className="ei-heir-invite-status">
                        App name: {preferred ? preferred : 'Not set yet'}
                        {preferred && preferred !== adminLabel ? ` · shows as ${publicName}` : ''}
                      </span>
                      <span className="ei-heir-invite-status">{inviteStatus(h.sibling_key)}</span>
                      <label className="ei-heir-tier-label" htmlFor={`ei-tier-${h.sibling_key}`}>
                        Access
                        <select
                          id={`ei-tier-${h.sibling_key}`}
                          className="ei-heir-tier-select"
                          value={normalizeHeirAccessTier(h.access_tier)}
                          onChange={(e) =>
                            handleHeirTierChange(h.sibling_key, adminLabel, e.target.value)
                          }
                        >
                          {HEIR_ACCESS_TIER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} title={opt.hint}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="ei-settings-hint ei-heir-tier-hint">
                        {
                          HEIR_ACCESS_TIER_OPTIONS.find(
                            (o) => o.value === normalizeHeirAccessTier(h.access_tier)
                          )?.hint
                        }
                      </span>
                    </div>
                    <span className="ei-heir-row-actions">
                      <button
                        type="button"
                        className="ei-btn ei-btn-secondary ei-btn-small"
                        disabled={resettingKey === h.sibling_key}
                        onClick={() => handleResetInvite(h.sibling_key, adminLabel)}
                      >
                        {resettingKey === h.sibling_key ? 'Saving…' : 'New PIN'}
                      </button>
                      <button
                        type="button"
                        className="ei-btn ei-btn-secondary ei-btn-small"
                        onClick={() => handleRenameHeir(h.sibling_key, adminLabel)}
                      >
                        Edit label
                      </button>
                      <button
                        type="button"
                        className="ei-btn ei-btn-secondary ei-btn-small"
                        onClick={() => handleRemoveHeir(h.sibling_key, adminLabel)}
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form className="ei-field ei-heir-add" onSubmit={handleAddHeir}>
          <h4 className="ei-settings-subhead">Add person</h4>
          <div className="ei-heir-add-row">
            <input
              id="ei-new-heir"
              value={newHeirName}
              onChange={(e) => setNewHeirName(e.target.value)}
              placeholder="Admin label (e.g. Alex Rivera)"
              autoComplete="off"
              aria-label="Admin label"
            />
            <select
              id="ei-new-heir-tier"
              aria-label="Access type"
              value={newHeirTier}
              onChange={(e) => setNewHeirTier(e.target.value)}
            >
              {HEIR_ACCESS_TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} title={opt.hint}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
            {
              HEIR_ACCESS_TIER_OPTIONS.find((o) => o.value === normalizeHeirAccessTier(newHeirTier))
                ?.hint
            }
          </p>
          <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
            Admin label is only for your records (and memorandum matching). They choose their app
            name after signing in with the PIN.
          </p>
          <div className="ei-heir-code-row">
            <div className="ei-heir-code-preview">
              <span className="ei-heir-code-label">PIN (auto)</span>
              <code className="ei-heir-issued-code">{newHeirInvite}</code>
            </div>
            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small"
              onClick={() => setNewHeirInvite(generateHeirInviteCode())}
            >
              New PIN
            </button>
          </div>
          <button
            type="submit"
            className="ei-btn ei-btn-secondary ei-btn-small"
            disabled={addingHeir || newHeirName.trim().length < 2}
          >
            {addingHeir ? 'Adding…' : 'Add'}
          </button>
        </form>

        {error ? <div className="ei-error">{error}</div> : null}
        {info ? <p className="ei-status">{info}</p> : null}
      </div>
    </EstateSettingsShell>
  );
};

export default EstateSettingsHeirsModal;
