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
  },
  heir: {
    key: 'heir',
    label: 'Heir invite',
    passwordKey: 'heir_invite_password',
    configuredKey: 'heir_invite_configured',
    emptyHint: 'Not set'
  }
};

function PasswordRow({ label, password, configured, revealed, emptyHint }) {
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
      <code className={`ei-access-pass-value${muted ? ' ei-access-pass-value--muted' : ''}`}>
        {display}
      </code>
    </div>
  );
}

/**
 * Shows current shared / temp passwords for admin, helper, and/or heir invite.
 * Requires estate-access-password-reminders.sql migration.
 *
 * @param {number} refreshKey
 * @param {boolean} compact
 * @param {Array<'admin'|'helper'|'heir'>} [levels]
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

  const rows = levels.map((id) => LEVELS[id]).filter(Boolean);

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

  return (
    <div className={`ei-access-passwords${compact ? ' ei-access-passwords--compact' : ''}`}>
      <div className="ei-access-passwords-head">
        <h4 className="ei-settings-subhead">
          {rows.length === 1 ? 'Current password' : 'Current access passwords'}
        </h4>
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
          Shared temporary passwords for each login level. Personal heir passwords (after someone
          changes from the invite) are private and are not shown here.
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
        </div>
      ) : null}
    </div>
  );
};

export default EstateSettingsAccessPasswords;
