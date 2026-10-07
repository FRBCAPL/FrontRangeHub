import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import SupabaseLogin from '@shared/components/modal/modal/SupabaseLogin';
import HubSignupForm from './HubSignupForm.jsx';
import './HubLoginModal.css';

/** Sign-in from the nav bar on any page (Google or email + password), with a general sign-up view. */
export default function HubLoginModal({ onClose, onLoginSuccess, startOnSignup = false }) {
  const location = useLocation();
  const [signingUp, setSigningUp] = useState(startOnSignup);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSuccess = (nameOrUser, email, pin, userType) => {
    let name = nameOrUser;
    if (typeof nameOrUser === 'object' && nameOrUser !== null) {
      const u = nameOrUser;
      name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'User';
      email = u.email;
      pin = pin || 'supabase-auth';
      userType = userType || u.userType || 'user';
    }
    onLoginSuccess?.(name, email, pin, userType);
    onClose();
  };

  return createPortal(
    <div className="hub-login-overlay" role="dialog" aria-modal="true" aria-labelledby="hub-login-title" onClick={onClose}>
      <div className="hub-login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hub-login-head">
          <h2 id="hub-login-title">{signingUp ? 'Create an account' : 'Log in'}</h2>
          <button type="button" className="hub-login-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="hub-login-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={!signingUp} className={signingUp ? '' : 'is-active'} onClick={() => setSigningUp(false)}>
            Log in
          </button>
          <button type="button" role="tab" aria-selected={signingUp} className={signingUp ? 'is-active' : ''} onClick={() => setSigningUp(true)}>
            Sign up
          </button>
        </div>
        {signingUp ? (
          <HubSignupForm onBack={() => setSigningUp(false)} returnTo={location.pathname || '/'} />
        ) : (
          <SupabaseLogin
            compact
            onSuccess={handleSuccess}
            onShowSignup={() => setSigningUp(true)}
            oauthReturnTo={location.pathname || '/'}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
