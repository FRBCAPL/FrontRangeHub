import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  completeEstateVaultOAuth,
  ESTATE_VAULT_OAUTH_FLAG
} from '@shared/services/estateVaultAuth.js';
import { ESTATEIT_PATH } from '@shared/utils/estateInventoryConstants.js';
import EstateBrandTitle from './EstateBrandTitle';
import './EstateInventoryApp.css';

/**
 * Completes Google OAuth for Estate Vault PRs — no Hub ladder approval UX.
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
      } catch {
        // ignore
      }

      const result = await completeEstateVaultOAuth();
      if (cancelled) return;

      if (!result.success) {
        setError(result.error || 'Google sign-in failed.');
        return;
      }

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
        <p className="ei-lede">
          {error ? 'Sign-in issue' : 'Finishing Google sign-in…'}
        </p>
      </header>
      {error ? (
        <div className="ei-portal-card">
          <div className="ei-error">{error}</div>
          <button
            type="button"
            className="ei-btn"
            style={{ marginTop: '0.75rem' }}
            onClick={() => navigate(ESTATEIT_PATH, { replace: true })}
          >
            Back to home
          </button>
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
