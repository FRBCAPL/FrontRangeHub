import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEstateOwnerSession } from '@shared/services/estateVaultAuth.js';
import { superMe, logSuperSignIn } from '@shared/services/estateSuperAdminService.js';
import { ESTATEIT_PATH } from '@shared/utils/estateInventoryConstants.js';
import EstateOwnerSignIn from './EstateOwnerSignIn';
import EstateSuperHome from './EstateSuperHome';
import EstateBrandTitle from './EstateBrandTitle';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import './EstateInventoryApp.css';

/**
 * Allowlisted Super Admin gate — independent of estate PIN / Hub platform admin.
 */
const EstateSuperGate = () => {
  const [session, setSession] = useState(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    const owner = await getEstateOwnerSession();
    if (!owner.success) {
      setSession(null);
      setAllowed(false);
      setLoading(false);
      return;
    }
    setSession(owner.data);
    const me = await superMe();
    if (!me.success) {
      setAllowed(false);
      setError(me.error || 'This account is not on the Super Admin allowlist.');
      setLoading(false);
      return;
    }
    setAllowed(true);
    setLoading(false);
    logSuperSignIn();
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading) {
    return (
      <div className="estate-inventory ei-landing ei-super">
        <p className="ei-status">Checking Super Admin access…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="estate-inventory ei-landing ei-super">
        <header className="ei-landing-hero">
          <p className="ei-eyebrow">Operator</p>
          <EstateBrandTitle />
          <p className="ei-lede">Sign in with an allowlisted Super Admin account.</p>
        </header>
        <EstateOwnerSignIn onSignedIn={() => refresh()} />
        <EstateSystemDisclaimer generic />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="estate-inventory ei-landing ei-super">
        <header className="ei-landing-hero">
          <p className="ei-eyebrow">Operator</p>
          <h1>Access denied</h1>
          <p className="ei-lede">
            Signed in as <strong>{session.email}</strong>, but this account is not a Super Admin.
          </p>
        </header>
        {error ? <div className="ei-error">{error}</div> : null}
        <p className="ei-settings-hint">
          <Link to={ESTATEIT_PATH}>Back to Estate Vault</Link>
          {' · '}
          <Link to={`${ESTATEIT_PATH}/owner`}>My estates</Link>
        </p>
        <EstateSystemDisclaimer generic />
      </div>
    );
  }

  return <EstateSuperHome session={session} onRefresh={refresh} />;
};

export default EstateSuperGate;
