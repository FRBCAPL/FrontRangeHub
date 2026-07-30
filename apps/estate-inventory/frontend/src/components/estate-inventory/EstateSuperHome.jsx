import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOutEstateVault } from '@shared/services/estateVaultSession.js';
import {
  stayOnPrHome,
  clearStayOnPrHome,
  logSuperSessionEnd
} from '@shared/services/estateSuperAdminService.js';
import { ESTATEIT_PATH } from '@shared/utils/estateInventoryConstants.js';
import EstateBrandTitle from './EstateBrandTitle';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import EstateSuperEstatesPanel from './EstateSuperEstatesPanel';
import EstateSuperUsersPanel from './EstateSuperUsersPanel';
import EstateSuperAuditPanel from './EstateSuperAuditPanel';
import './EstateInventoryApp.css';

const TABS = [
  {
    id: 'estates',
    label: 'Estates',
    title: 'Manage individual estates: open, hide, rename, help with PINs, or permanently delete test estates.'
  },
  {
    id: 'users',
    label: 'Owners',
    title: 'Manage PR accounts: block Estate Vault sign-in, or permanently delete a test user’s EV data (login for other apps is kept).'
  },
  {
    id: 'audit',
    label: 'Operator audit',
    title: 'View and export the sealed log of every Super Admin action. Separate from the PR activity log.'
  }
];

/**
 * Super Admin console shell after allowlist gate.
 */
const EstateSuperHome = ({ session }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('estates');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError('');

    // Record the session ending while the operator's authenticated identity
    // is still available. Audit failure must never trap someone in a session.
    await logSuperSessionEnd();
    clearStayOnPrHome();
    const result = await signOutEstateVault();

    if (!result.success) {
      setSignOutError(result.error || 'Could not sign out. Please try again.');
      setSigningOut(false);
      return;
    }
    navigate(result.path, { replace: true });
  };

  return (
    <div className="estate-inventory ei-landing ei-super">
      <header className="ei-landing-hero">
        <p className="ei-eyebrow">Super Admin</p>
        <EstateBrandTitle />
        <p className="ei-lede">
          Operator console for <strong>{session?.email}</strong>.
          <br />
          Every major action is sealed in the operator audit log (not the PR activity log).
        </p>
        <div className="ei-landing-hero-actions">
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            onClick={handleSignOut}
            disabled={signingOut}
            title="End the Super Admin session, clear estate access on this device, and sign out of Estate Vault."
          >
            {signingOut ? 'Signing out…' : 'Sign out of Super Admin'}
          </button>
        </div>
        {signOutError ? <div className="ei-error">{signOutError}</div> : null}
      </header>

      <div className="ei-portal-card ei-super-card">
        <div className="ei-owner-mode-tabs" role="tablist" aria-label="Super Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`ei-owner-mode-tab${tab === t.id ? ' is-active' : ''}`}
              title={t.title}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'estates' ? <EstateSuperEstatesPanel /> : null}
        {tab === 'users' ? <EstateSuperUsersPanel /> : null}
        {tab === 'audit' ? <EstateSuperAuditPanel /> : null}

        <p className="ei-settings-hint" style={{ marginTop: '1rem' }}>
          <Link to={ESTATEIT_PATH} title="Back to the public Estate Vault home page.">
            Estate Vault home
          </Link>
          {' · '}
          <Link
            to={`${ESTATEIT_PATH}/owner`}
            onClick={stayOnPrHome}
            title="Open the PR “My estates” page for this signed-in account (stays off the Super Admin redirect for this session)."
          >
            My estates
          </Link>
          {' · '}
          <button
            type="button"
            className="ei-linkish"
            title="End the Super Admin session, clear estate access on this device, and sign out of Estate Vault."
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out of Super Admin'}
          </button>
        </p>
      </div>

      <EstateSystemDisclaimer generic />
    </div>
  );
};

export default EstateSuperHome;
