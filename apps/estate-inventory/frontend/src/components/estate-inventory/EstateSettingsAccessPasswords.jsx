import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { useEstateCase } from './EstateCaseContext';

function PasswordRow({ label, password, configured, revealed, emptyHint, note }) {
  let display;
  if (!configured && !password) {
    display = emptyHint || 'Not set';
  } else if (!password) {
    display = 'Set again to store a reminder';
  } else if (revealed) {
    display = password;
  } else {
    display = '••••••••';
  }

  const muted = !password || (!configured && !password);

  return (
    <div className="ei-access-pass-row">
      <span className="ei-access-pass-label">{label}</span>
      <div className="ei-access-pass-value-wrap">
        <code className={`ei-access-pass-value${muted ? ' ei-access-pass-value--muted' : ''}`}>
          {display}
        </code>
        {note ? <span className="ei-access-pass-note">{note}</span> : null}
      </div>
    </div>
  );
}

/**
 * Helper password and per-person heir PINs for this estate.
 *
 * The admin password is never returned by the server — it is the re-auth
 * credential, so the PR types it here instead of reading it back.
 *
 * @param {number} refreshKey
 * @param {boolean} compact
 * @param {Array<'helper'|'heir'>} [levels]
 */
const EstateSettingsAccessPasswords = ({
  refreshKey = 0,
  compact = false,
  levels = ['helper', 'heir']
}) => {
  const { caseNumber } = useEstateCase();
  const [adminPassword, setAdminPassword] = useState('');
  const [unlockedWith, setUnlockedWith] = useState('');
  const [passwords, setPasswords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);

  const showHelper = levels.includes('helper');
  const showHeirs = levels.includes('heir');

  // Re-lock whenever the estate changes or the parent asks for a refresh.
  useEffect(() => {
    setPasswords(null);
    setUnlockedWith('');
    setAdminPassword('');
    setRevealed(false);
    setError('');
  }, [caseNumber]);

  useEffect(() => {
    if (!unlockedWith) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await estateInventoryService.getAccessPasswords(caseNumber, unlockedWith);
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setPasswords(null);
        setUnlockedWith('');
        setError(result.error || 'Could not load access codes.');
        return;
      }
      setPasswords(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, caseNumber, unlockedWith]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');
    const typed = adminPassword.trim();
    if (!typed) {
      setError('Enter the current admin password.');
      return;
    }
    setLoading(true);
    const result = await estateInventoryService.getAccessPasswords(caseNumber, typed);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load access codes.');
      return;
    }
    setPasswords(result.data);
    setUnlockedWith(typed);
    setAdminPassword('');
  };

  const handleLock = () => {
    setPasswords(null);
    setUnlockedWith('');
    setRevealed(false);
  };

  const heirs = passwords?.heirs || [];
  const title = showHeirs && !showHelper ? 'Heir PINs' : 'Helper password and heir PINs';

  if (!passwords) {
    return (
      <div className={`ei-access-passwords${compact ? ' ei-access-passwords--compact' : ''}`}>
        <h4 className="ei-settings-subhead">{title}</h4>
        <p className="ei-settings-hint">
          Access codes are hidden until you confirm the admin password. This keeps helper and heir
          codes out of reach if a signed-in device is left open.
        </p>
        <form className="ei-modal-form" onSubmit={handleUnlock}>
          <div className="ei-field">
            <label htmlFor="ei-access-admin-pass">Current admin password</label>
            <input
              id="ei-access-admin-pass"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          <button type="submit" className="ei-btn" disabled={loading || !adminPassword.trim()}>
            {loading ? 'Checking…' : 'Show access codes'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`ei-access-passwords${compact ? ' ei-access-passwords--compact' : ''}`}>
      <div className="ei-access-passwords-head">
        <h4 className="ei-settings-subhead">{title}</h4>
        <div className="ei-btn-row">
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small"
            onClick={() => setRevealed((v) => !v)}
            disabled={loading}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
          <button
            type="button"
            className="ei-btn ei-btn-secondary ei-btn-small"
            onClick={handleLock}
          >
            Lock
          </button>
        </div>
      </div>
      {!compact ? (
        <p className="ei-settings-hint ei-access-passwords-hint">
          Reminders for codes you issued. Heirs keep the PIN you assigned — if they lose it, issue a
          new PIN under Family / heirs. App names heirs chose appear there too.
        </p>
      ) : null}
      {loading ? <p className="ei-settings-hint">Loading…</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      <div className="ei-access-pass-list" aria-live="polite">
        {showHelper ? (
          <PasswordRow
            label="Helper"
            password={passwords.helper_password}
            configured={passwords.helper_configured}
            revealed={revealed}
            emptyHint="Not set"
            note={passwords.helper_weak ? 'Easy to guess — set a new one' : null}
          />
        ) : null}
        {showHeirs ? (
          heirs.length === 0 ? (
            <p className="ei-settings-hint">No heirs added yet.</p>
          ) : (
            heirs.map((h) => {
              let note = null;
              const preferred = String(h.preferred_name || '').trim();
              if (!h.invite_configured) {
                note = 'Set a PIN in Family / heirs';
              } else if (h.invite_weak) {
                note = 'Easy to guess — issue a new PIN';
              } else if (preferred) {
                note = `App name: ${preferred}`;
              }
              return (
                <PasswordRow
                  key={h.sibling_key || h.display_name}
                  label={h.display_name || 'Heir'}
                  password={h.invite_password}
                  configured={h.invite_configured}
                  revealed={revealed}
                  emptyHint="Not set"
                  note={note}
                />
              );
            })
          )
        ) : null}
      </div>
    </div>
  );
};

export default EstateSettingsAccessPasswords;
