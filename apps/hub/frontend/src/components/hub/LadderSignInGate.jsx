import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SupabaseLogin from '@shared/components/modal/modal/SupabaseLogin';
import SupabaseSignupModal from '@shared/components/auth/SupabaseSignupModal';
import StandaloneLadderModal from '@shared/components/guest/StandaloneLadderModal';
import ContactAdminModal from '@apps/ladder/frontend/src/components/ladder/ContactAdminModal.jsx';
import {
  LADDER_ONE_LINER,
  LADDER_RETURNING_HINT,
  LADDER_NEW_PLAYER_HINT
} from '@shared/utils/utils/ladderEntryCopy.js';
import './LadderSignInGate.css';

/**
 * Shown at /ladder when the user is not authenticated (e.g. after logout).
 */
const LadderSignInGate = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const loginRef = useRef(null);
  const [showSignup, setShowSignup] = useState(false);
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [showPublicLadder, setShowPublicLadder] = useState(false);

  useEffect(() => {
    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    const params = qIndex >= 0 ? new URLSearchParams(hash.slice(qIndex + 1)) : null;
    if (location.state?.openSignup || params?.get('signup') === '1') {
      setShowSignup(true);
      if (location.state?.openSignup) {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, location.hash]);

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLoginSuccess = (nameOrUser, email, pin, userType) => {
    let name = nameOrUser;
    if (typeof nameOrUser === 'object' && nameOrUser !== null) {
      const u = nameOrUser;
      name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'User';
      email = u.email;
      pin = pin || 'supabase-auth';
      userType = userType || u.userType || 'user';
    }
    onLoginSuccess(name, email, pin, userType);
  };

  return (
    <div className="ladder-sign-in-gate">
      <header className="ladder-sign-in-gate-header">
        <p className="ladder-sign-in-gate-eyebrow">Ladder of Legends · BCAPL singles</p>
        <h1>Player access</h1>
        <p className="ladder-sign-in-gate-pitch">{LADDER_ONE_LINER}</p>
      </header>

      <div className="ladder-sign-in-gate-hero-ctas">
        <button
          type="button"
          className="ladder-sign-in-gate-btn primary"
          onClick={scrollToLogin}
        >
          Player login
        </button>
        <button
          type="button"
          className="ladder-sign-in-gate-btn primary-alt"
          onClick={() => setShowSignup(true)}
        >
          New player? Start here
        </button>
      </div>

      <p className="ladder-sign-in-gate-hint">{LADDER_RETURNING_HINT}</p>

      <section
        id="ladder-player-login"
        ref={loginRef}
        className="ladder-sign-in-gate-login"
        aria-labelledby="ladder-login-heading"
      >
        <h2 id="ladder-login-heading" className="ladder-sign-in-gate-section-title">
          Sign in
        </h2>
        <SupabaseLogin
          compact
          onSuccess={handleLoginSuccess}
          onShowSignup={() => setShowSignup(true)}
        />
      </section>

      <section className="ladder-sign-in-gate-new-player" aria-labelledby="ladder-new-heading">
        <h2 id="ladder-new-heading" className="ladder-sign-in-gate-section-title">
          New to the ladder?
        </h2>
        <p className="ladder-sign-in-gate-hint">{LADDER_NEW_PLAYER_HINT}</p>
        <div className="ladder-sign-in-gate-new-actions">
          <button
            type="button"
            className="ladder-sign-in-gate-btn secondary"
            onClick={() => setShowSignup(true)}
          >
            Create account
          </button>
          <button
            type="button"
            className="ladder-sign-in-gate-btn secondary"
            onClick={() => setShowContactAdmin(true)}
          >
            Contact admin
          </button>
        </div>
      </section>

      <section className="ladder-sign-in-gate-review" aria-labelledby="ladder-browse-heading">
        <h2 id="ladder-browse-heading" className="ladder-sign-in-gate-review-title">
          Just browsing
        </h2>
        <button
          type="button"
          className="ladder-sign-in-gate-btn tertiary"
          onClick={() => setShowPublicLadder(true)}
        >
          View ladder rankings
        </button>
        <button
          type="button"
          className="ladder-sign-in-gate-btn tertiary"
          onClick={() => { window.location.href = '/ladder-embed'; }}
        >
          Full public ladder + recent matches
        </button>
      </section>

      <div className="ladder-sign-in-gate-actions">
        <button
          type="button"
          className="ladder-sign-in-gate-btn link"
          onClick={() => navigate('/')}
        >
          ← Back to Front Range home
        </button>
      </div>

      <SupabaseSignupModal
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        onSuccess={() => setShowSignup(false)}
      />

      <ContactAdminModal
        isOpen={showContactAdmin}
        onClose={() => setShowContactAdmin(false)}
      />

      {showPublicLadder && (
        <StandaloneLadderModal
          isOpen={showPublicLadder}
          onClose={() => setShowPublicLadder(false)}
        />
      )}
    </div>
  );
};

export default LadderSignInGate;
