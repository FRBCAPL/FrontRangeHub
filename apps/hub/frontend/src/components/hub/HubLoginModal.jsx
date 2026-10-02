import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import SupabaseLogin from '@shared/components/modal/modal/SupabaseLogin';
import './HubLoginModal.css';

/** Sign-in from the nav bar on any page (Google or email + password). */
export default function HubLoginModal({ onClose, onLoginSuccess }) {
  const location = useLocation();

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
          <h2 id="hub-login-title">Sign in</h2>
          <button type="button" className="hub-login-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <SupabaseLogin compact onSuccess={handleSuccess} oauthReturnTo={location.pathname || '/'} />
      </div>
    </div>,
    document.body
  );
}
