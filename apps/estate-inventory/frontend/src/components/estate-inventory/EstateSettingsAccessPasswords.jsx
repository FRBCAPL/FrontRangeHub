import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';

const LEVELS = {
  admin: {
    key: 'admin',
    label: 'Admin (PR)',
    passwordKey: 'admin_password',
    configuredKey: 'admin_configured',
    emptyHint: 'Default 123456'
  },
  helper: {
    key: 'helper',
    label: 'Helper',
    passwordKey: 'helper_password',
    configuredKey: 'helper_configured',
    emptyHint: 'Not set'
  }
};

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
 * Shows current shared / temp passwords for admin, helper, and per-person heir invites.
 * Requires estate-access-password-reminders.sql + estate-per-heir-invite-password.sql.
 *
 * @param {number} refreshKey
 * @param {boolean} compact
 * @param {Array<'admin'|'helper'|'heir'>} [levels] — 'heir' shows per-person invites
 */
const EstateSettingsAccessPasswords = ({
  refreshKey = 0,
  compact = false,
  levels = ['admin', 'helper', 'heir']
}) => {
  const [passwords, setPasswords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);

  const showShared = levels.filter((id) => id === 'admin' || id === 'helper');
  const showHeirs = levels.includes('heir');
  const rows = showShared.map((id) => LEVELS[id]).filter(Boolean);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const result = await estateInventoryService.getAccessPasswords();
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setPasswords(null);
        setError(result.error || 'Could not load passwords.');
        return;
      }
      setPasswords(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const heirs = passwords?.heirs || [];
  const title =
    rows.length === 0 && showHeirs
      ? 'Heir PINs'
      : rows.length === 1 && !showHeirs
        ? 'Current password'
        : 'Current access passwords';

  return (
    <div className={`ei-access-passwords${compact ? ' ei-access-passwords--compact' : ''}`}>
      <div className="ei-access-passwords-head">
        <h4 className="ei-settings-subhead">{title}</h4>
        <button
          type="button"
          className="ei-btn ei-btn-secondary ei-btn-small"
          onClick={() => setRevealed((v) => !v)}
          disabled={loading || !passwords}
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
      </div>
      {!compact ? (
        <p className="ei-settings-hint ei-access-passwords-hint">
          Temporary codes you can remind yourself of. Heirs keep the PIN you assigned — if they lose
          it, issue a new PIN under Family / heirs. App names heirs chose appear there too.
        </p>
      ) : null}
      {loading ? <p className="ei-settings-hint">Loading…</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      {passwords ? (
        <div className="ei-access-pass-list" aria-live="polite">
          {rows.map((row) => (
            <PasswordRow
              key={row.key}
              label={row.label}
              password={passwords[row.passwordKey]}
              configured={passwords[row.configuredKey]}
              revealed={revealed}
              emptyHint={row.emptyHint}
            />
          ))}
          {showHeirs ? (
            heirs.length === 0 ? (
              <p className="ei-settings-hint">No heirs added yet.</p>
            ) : (
              heirs.map((h) => {
                let note = null;
                const preferred = String(h.preferred_name || '').trim();
                if (!h.invite_configured) {
                  note = 'Set a PIN in Family / heirs';
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
      ) : null}
    </div>
  );
};

export default EstateSettingsAccessPasswords;
