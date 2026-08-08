import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { getEstateOwnerSession } from '@shared/services/estateVaultAuth.js';
import { getPrProfile } from '@shared/services/estatePrIdentityService.js';
import {
  leaveCurrentEstateDestination,
  signOutEstateVault
} from '@shared/services/estateVaultSession.js';
import { ESTATEIT_PATH, estateDisplayCaseNumber, estateitCasePath, estateitPortalHomePath } from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import EstateInventoryApp from './EstateInventoryApp';
import EstatePanelErrorBoundary from './EstatePanelErrorBoundary';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import ForceAdminPasswordModal from './ForceAdminPasswordModal';
import EstateAdminPinResetModal from './EstateAdminPinResetModal';
import EstateWhatsNewModal from './EstateWhatsNewModal';
import EstateWhatIsVaultModal from './EstateWhatIsVaultModal';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal';
import EstateFaqModal from './EstateFaqModal';
import {
  EstateAuthPinInput,
  EstateAutofillTrap
} from './EstateAuthField';
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
  const [showWhatIsVault, setShowWhatIsVault] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [ownerHint, setOwnerHint] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [info, setInfo] = useState('');
  const [caseLabel, setCaseLabel] = useState(caseNumber);
  const [blockedRole, setBlockedRole] = useState(() =>
    estateInventoryService.describeActiveNonAdminEstateRole()
  );
  const [recentTransfer, setRecentTransfer] = useState(null);

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
    setBlockedRole(estateInventoryService.describeActiveNonAdminEstateRole());
    setRecentTransfer(null);

    let cancelled = false;
    (async () => {
      const settings = await estateInventoryService.getSettings(caseNumber);
      if (!cancelled && settings.success) {
        setCaseLabel(estateDisplayCaseNumber(settings.data, caseNumber));
      }

      const session = await getEstateOwnerSession();
      if (cancelled || !session.success) return;

      const profileResult = await getPrProfile();
      if (!cancelled && profileResult.success && profileResult.data?.recent_identity_transfer) {
        setRecentTransfer(profileResult.data.recent_identity_transfer);
      }

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

  const handleLeaveInviteRole = async () => {
    setBusy(true);
    setError('');
    const path = await leaveCurrentEstateDestination();
    setBusy(false);
    setBlockedRole('');
    navigate(path);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    if (estateInventoryService.hasActiveNonAdminEstateRole()) {
      setBusy(false);
      setBlockedRole(estateInventoryService.describeActiveNonAdminEstateRole());
      setError(
        'You are signed in as a family or helper role. Leave that session before unlocking admin.'
      );
      return;
    }

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
      <EstatePanelErrorBoundary title="Admin workspace failed to render." label="admin">
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
      </EstatePanelErrorBoundary>
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
        onOpenWhatIsVault={() => setShowWhatIsVault(true)}
        onOpenLegalDisclaimer={() => setShowLegalDisclaimer(true)}
        onOpenFaq={() => setShowFaq(true)}
      />
      <p className="ei-lede" style={{ marginBottom: '1rem' }}>
        Enter the estate admin PIN for case <strong>{caseLabel}</strong>. New estates get a
        one-time PIN shown when the estate is created — you are required to change it after the first
        unlock.
      </p>
      {blockedRole ? (
        <div className="ei-portal-card" style={{ marginBottom: '1rem' }}>
          <div className="ei-error" style={{ marginBottom: '0.75rem' }}>
            This device is signed in as {blockedRole}. Family and helper roles cannot unlock the
            Personal Representative portal. Leave that session first, then sign in as PR.
          </div>
          <button type="button" className="ei-btn" onClick={handleLeaveInviteRole} disabled={busy}>
            {busy ? 'Leaving…' : 'Leave estate session'}
          </button>
          <p className="ei-settings-hint" style={{ marginTop: '0.85rem' }}>
            <Link to={caseHome}>Back to role home</Link>
          </p>
        </div>
      ) : null}
      {ownerHint && !blockedRole ? <p className="ei-settings-hint">{ownerHint}</p> : null}
      {recentTransfer && !blockedRole ? (
        <div className="ei-notice ei-portal-card" style={{ marginBottom: '1rem' }}>
          <strong>After identity transfer:</strong> use the <strong>new case admin PIN</strong> emailed
          to this login address. Your previous PIN no longer works. You will choose a personal PIN on
          first unlock.
        </div>
      ) : null}
      <form className="ei-portal-card" onSubmit={handleSubmit} autoComplete="off">
        <EstateAutofillTrap />
        <div className="ei-field">
          <label htmlFor="ei-admin-pass">Admin PIN</label>
          <div className="ei-password-row">
            <EstateAuthPinInput
              id="ei-admin-pass"
              name="estate_vault_admin_pin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              revealed={showPassword}
              required
              autoFocus
              disabled={Boolean(blockedRole)}
            />
            <button
              type="button"
              className="ei-btn ei-btn-secondary ei-btn-small ei-see-password"
              onClick={() => setShowPassword((v) => !v)}
              disabled={Boolean(blockedRole)}
            >
              {showPassword ? 'Hide' : 'Show PIN'}
            </button>
          </div>
        </div>
        {error ? <div className="ei-error">{error}</div> : null}
        {info ? <p className="ei-status">{info}</p> : null}
        <button type="submit" className="ei-btn" disabled={busy || !password || Boolean(blockedRole)}>
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
      <EstateWhatIsVaultModal
        open={showWhatIsVault}
        onClose={() => setShowWhatIsVault(false)}
      />
      <EstateLegalDisclaimerModal
        open={showLegalDisclaimer}
        onClose={() => setShowLegalDisclaimer(false)}
      />
      <EstateFaqModal open={showFaq} onClose={() => setShowFaq(false)} />
      <EstateSystemDisclaimer />
    </div>
  );
};

export default EstateAdminGate;
