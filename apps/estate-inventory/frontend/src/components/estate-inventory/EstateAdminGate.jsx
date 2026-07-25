import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import EstateNav from './EstateNav';
import EstateInventoryApp from './EstateInventoryApp';
import ForceAdminPasswordModal from './ForceAdminPasswordModal';
import './EstateInventoryApp.css';

/**
 * Second gate for Personal Representative admin (default password 123456 until changed).
 * Hub sign-in is still required by the route for Supabase RLS.
 */
const EstateAdminGate = () => {
  const [unlocked, setUnlocked] = useState(() => estateInventoryService.isAdminUnlocked());
  const [mustChangePassword, setMustChangePassword] = useState(() =>
    estateInventoryService.adminMustChangePassword()
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result = await estateInventoryService.verifyAdminPassword(password);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Incorrect password.');
      return;
    }
    setPassword('');
    setMustChangePassword(Boolean(result.data?.must_change_password));
    setUnlocked(true);
  };

  if (unlocked) {
    return (
      <>
        <ForceAdminPasswordModal
          open={mustChangePassword}
          onComplete={() => setMustChangePassword(false)}
        />
        <EstateInventoryApp
          onLock={() => {
            estateInventoryService.clearAdminUnlock();
            setUnlocked(false);
            setMustChangePassword(false);
            setPassword('');
          }}
        />
      </>
    );
  }

  return (
    <div className="estate-inventory ei-portal">
      <EstateNav
        title="Admin login"
        crumbs={[
          { label: 'Roles', to: '/estateit' },
          { label: 'Admin' }
        ]}
      />
      <p className="ei-lede" style={{ marginBottom: '1rem' }}>
        Enter the estate admin password to manage inventory. Default until you change it:{' '}
        <strong>123456</strong> (you will be required to change it after unlock).
      </p>
      <form className="ei-portal-card" onSubmit={handleSubmit}>
        <div className="ei-field">
          <label htmlFor="ei-admin-pass">Admin password</label>
          <div className="ei-password-row">
            <input
              id="ei-admin-pass"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              autoFocus
            />
            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small ei-see-password"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? 'Hide' : 'See password'}
            </button>
          </div>
        </div>
        {error ? <div className="ei-error">{error}</div> : null}
        <button type="submit" className="ei-btn" disabled={busy || !password}>
          {busy ? 'Checking…' : 'Unlock admin'}
        </button>
        <p className="ei-settings-hint" style={{ marginTop: '0.85rem' }}>
          Wrong role? <Link to="/estateit">Back to role home</Link>
        </p>
      </form>
    </div>
  );
};

export default EstateAdminGate;
