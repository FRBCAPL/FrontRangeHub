import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estateitCasePath } from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import EstateInventoryApp from './EstateInventoryApp';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import ForceAdminPasswordModal from './ForceAdminPasswordModal';
import EstateWhatsNewModal from './EstateWhatsNewModal';
import './EstateInventoryApp.css';

/**
 * PR admin: EstateIt password only — standalone estate login.
 */
const EstateAdminGate = () => {
  const { caseNumber } = useEstateCase();
  const caseHome = estateitCasePath(caseNumber);
  const [unlocked, setUnlocked] = useState(() =>
    estateInventoryService.isAdminUnlocked(caseNumber)
  );
  const [mustChangePassword, setMustChangePassword] = useState(() =>
    estateInventoryService.adminMustChangePassword(caseNumber)
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    setUnlocked(estateInventoryService.isAdminUnlocked(caseNumber));
    setMustChangePassword(estateInventoryService.adminMustChangePassword(caseNumber));
    setPassword('');
    setError('');
  }, [caseNumber]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result = await estateInventoryService.loginEstateAdmin(password, caseNumber);
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
          { label: 'Home', to: caseHome },
          { label: 'Admin' }
        ]}
        onOpenWhatsNew={() => setShowWhatsNew(true)}
      />
      <p className="ei-lede" style={{ marginBottom: '1rem' }}>
        Enter the EstateIt admin password for case <strong>{caseNumber}</strong>. Default until you
        change it: <strong>123456</strong> (you will be required to change it after unlock).
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
          {busy ? 'Signing in…' : 'Unlock admin'}
        </button>
        <p className="ei-settings-hint" style={{ marginTop: '0.85rem' }}>
          Wrong role? <Link to={caseHome}>Back to role home</Link>
        </p>
      </form>
      <EstateWhatsNewModal
        role="admin"
        enabled={false}
        open={showWhatsNew}
        onOpenChange={setShowWhatsNew}
      />
      <EstateSystemDisclaimer />
    </div>
  );
};

export default EstateAdminGate;
