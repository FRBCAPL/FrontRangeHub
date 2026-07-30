import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { getEstateOwnerSession } from '@shared/services/estateVaultAuth.js';
import {
  leaveCurrentEstateDestination,
  signOutEstateVault
} from '@shared/services/estateVaultSession.js';
import { ESTATEIT_PATH, estateDisplayCaseNumber, estateitCasePath } from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import EstateInventoryApp from './EstateInventoryApp';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import ForceAdminPasswordModal from './ForceAdminPasswordModal';
import EstateAdminPinResetModal from './EstateAdminPinResetModal';
import EstateWhatsNewModal from './EstateWhatsNewModal';
import './EstateInventoryApp.css';

/**
 * PR admin: account may identify the owner; case PIN still unlocks this device.
 */
const EstateAdminGate = () => {
  const navigate = useNavigate();
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
  const [ownerHint, setOwnerHint] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [info, setInfo] = useState('');
  const [caseLabel, setCaseLabel] = useState(caseNumber);

  useEffect(() => {
    setUnlocked(estateInventoryService.isAdminUnlocked(caseNumber));
    setMustChangePassword(estateInventoryService.adminMustChangePassword(caseNumber));
    setPassword('');
    setError('');
    setOwnerHint('');
    setIsOwner(false);
    setResetOpen(false);
    setInfo('');
    setCaseLabel(caseNumber);

    let cancelled = false;
    (async () => {
      const settings = await estateInventoryService.getSettings(caseNumber);
      if (!cancelled && settings.success) {
        setCaseLabel(estateDisplayCaseNumber(settings.data, caseNumber));
      }

      const session = await getEstateOwnerSession();
      if (cancelled || !session.success) return;
      const ownership = await estateInventoryService.isLoggedInOwnerOfCase(caseNumber);
      if (cancelled) return;
      if (ownership.success && ownership.data === true) {
        setIsOwner(true);
        setOwnerHint(
          session.data?.email
            ? `Signed in as ${session.data.email}. Enter the case admin PIN to unlock this device.`
            : 'Signed in. Enter the case admin PIN to unlock this device.'
        );
      } else if (session.success) {
        setOwnerHint(
          'A different account is signed in. Unlocking with the case PIN will switch to this estate’s owner session.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
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
    if (mustChangePassword) {
      return (
        <ForceAdminPasswordModal
          open
          onComplete={() => setMustChangePassword(false)}
        />
      );
    }
    return (
      <EstateInventoryApp
        onLock={() => {
          // Lock this device only — same estate, require admin PIN again.
          estateInventoryService.clearAdminUnlock();
          setUnlocked(false);
          setMustChangePassword(false);
          setPassword('');
        }}
        onLeaveEstate={async () => {
          const path = await leaveCurrentEstateDestination();
          navigate(path);
        }}
        onSignOutApp={async () => {
          const result = await signOutEstateVault();
          navigate(result.path || ESTATEIT_PATH);
        }}
      />
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
        Enter the Estate Vault admin password for case <strong>{caseLabel}</strong>. New estates get a
        one-time PIN shown when the estate is created — you are required to change it after the first
        unlock.
      </p>
      {ownerHint ? <p className="ei-settings-hint">{ownerHint}</p> : null}
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
        {info ? <p className="ei-status">{info}</p> : null}
        <button type="submit" className="ei-btn" disabled={busy || !password}>
          {busy ? 'Signing in…' : 'Unlock admin'}
        </button>
        {isOwner ? (
          <p className="ei-settings-hint" style={{ marginTop: '0.85rem' }}>
            <button
              type="button"
              className="ei-link-btn"
              onClick={() => setResetOpen(true)}
              title="You are signed in as the owner of this estate, so you can set a new PIN without the old one."
            >
              Forgot the admin PIN?
            </button>
          </p>
        ) : null}
        <p className="ei-settings-hint" style={{ marginTop: '0.85rem' }}>
          Personal Representative?{' '}
          <Link to={`${ESTATEIT_PATH}/owner`}>My estates</Link>
          {' · '}
          <Link to={caseHome}>Back to role home</Link>
        </p>
      </form>
      <EstateAdminPinResetModal
        open={resetOpen}
        caseLabel={caseLabel}
        onClose={() => setResetOpen(false)}
        onDone={(newPin) => {
          setResetOpen(false);
          setError('');
          setPassword(newPin);
          setInfo('Admin PIN updated. Select Unlock admin to continue.');
        }}
      />
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
