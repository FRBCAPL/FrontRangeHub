import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  completeEstateVaultOAuth,
  ESTATE_VAULT_OAUTH_FLAG
} from '@shared/services/estateVaultAuth.js';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { ESTATEIT_PATH } from '@shared/utils/estateInventoryConstants.js';
import EstateBrandTitle from './EstateBrandTitle';
import './EstateInventoryApp.css';

/**
 * Completes Estate Vault PR sign-in for both Google OAuth and email
 * confirmation links — no Hub ladder approval UX.
 */
const EstateVaultOAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        localStorage.removeItem(ESTATE_VAULT_OAUTH_FLAG);
        sessionStorage.removeItem(ESTATE_VAULT_OAUTH_FLAG);
      } catch {
        // ignore
      }

      if (estateInventoryService.hasActiveNonAdminEstateRole()) {
        if (!cancelled) {
          setError(
            'You are signed in as a family or helper role. Leave that estate session, then sign in as Personal Representative.'
          );
        }
        return;
      }

      const result = await completeEstateVaultOAuth();
      if (cancelled) return;

      if (!result.success) {
        setError(result.error || 'Sign-in could not be completed.');
        return;
      }

      estateInventoryService.clearSiblingSession();
      estateInventoryService.clearHelperSession();
      navigate(`${ESTATEIT_PATH}/owner`, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="estate-inventory ei-landing ei-case-entry">
      <header className="ei-landing-hero">
        <p className="ei-eyebrow">Personal Representative</p>
        <EstateBrandTitle />
        <p className="ei-lede">{error ? 'Sign-in issue' : 'Finishing sign-in…'}</p>
      </header>
      {error ? (
        <div className="ei-portal-card">
          <div className="ei-error">{error}</div>
          <div className="ei-btn-row" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="ei-btn"
              onClick={() => navigate(`${ESTATEIT_PATH}/owner`, { replace: true })}
            >
              Go to sign in
            </button>
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={() => navigate(ESTATEIT_PATH, { replace: true })}
            >
              Back to home
            </button>
          </div>
        </div>
      ) : (
        <p className="ei-status">Please wait…</p>
      )}
      {timedOut && !error ? (
        <p className="ei-settings-hint">
          Taking too long?{' '}
          <button type="button" className="ei-btn ei-btn-secondary ei-btn-small" onClick={() => navigate(ESTATEIT_PATH)}>
            Return home
          </button>
        </p>
      ) : null}
    </div>
  );
};

export default EstateVaultOAuthCallback;
