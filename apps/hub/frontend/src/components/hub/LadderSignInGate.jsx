import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SupabaseLogin from '@shared/components/modal/modal/SupabaseLogin';
import SupabaseSignupModal from '@shared/components/auth/SupabaseSignupModal';
import StandaloneLadderModal from '@shared/components/guest/StandaloneLadderModal';
import './LadderSignInGate.css';

/**
 * Shown at /ladder when the user is not authenticated (e.g. after logout).
 * Avoids redirecting to homepage so the ladder card and deep links keep working.
 */
const LadderSignInGate = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [showSignup, setShowSignup] = useState(false);
  const [showPublicLadder, setShowPublicLadder] = useState(false);

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
      <div className="ladder-sign-in-gate-header">
        <h1>Ladder of Legends</h1>
        <p>Sign in to challenge players, report matches, and use your player tools.</p>
      </div>

      <div className="ladder-sign-in-gate-login">
        <SupabaseLogin
          compact
          onSuccess={handleLoginSuccess}
          onShowSignup={() => setShowSignup(true)}
        />
      </div>

      <div className="ladder-sign-in-gate-actions">
        <button
          type="button"
          className="ladder-sign-in-gate-btn secondary"
          onClick={() => setShowPublicLadder(true)}
        >
          View ladder rankings (no login)
        </button>
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
