/**
 * Unified Hub Auth - One simple flow for login, signup, and ladder access.
 * 
 * Design: "Continue with Google" does everything.
 * - Returning user? → Log in
 * - New user? → Create account + ladder profile, pending approval
 * - Claim position? → Use the Claim flow (enter name first, then Google)
 */

import React, { useState } from 'react';
import supabaseAuthService from '@shared/services/services/supabaseAuthService.js';

export default function UnifiedHubAuth({ onSuccess, onShowClaimFlow }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailOption, setShowEmailOption] = useState(false);

  const handleContinueWithGoogle = async () => {
    setMessage('');
    setLoading(true);
    localStorage.removeItem('__DUES_TRACKER_OAUTH__');

    // Always set pendingOAuthSignup so new users get ladder_profile created.
    // Returning users: callback will find existing profile and skip.
    const returnTo = typeof window !== 'undefined' ? (window.location.pathname || '/hub') : '/hub';
    localStorage.setItem('oauthReturnTo', returnTo || '/hub');
    localStorage.setItem('pendingOAuthSignup', JSON.stringify({
      isNewSignup: true,
      ladderName: '499-under',
      fargoRate: '400'
    }));

    try {
      const result = await supabaseAuthService.signInWithOAuth('google');
      if (!result.success) {
        setMessage(result.message || 'Failed to sign in with Google.');
        setLoading(false);
        localStorage.removeItem('pendingOAuthSignup');
      }
    } catch (err) {
      console.error('Google OAuth error:', err);
      setMessage('Failed to sign in. Please try again.');
      setLoading(false);
      localStorage.removeItem('pendingOAuthSignup');
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.9), rgba(30, 30, 30, 0.95))',
      border: '2px solid #e53e3e',
      borderRadius: isMobile ? 12 : 16,
      padding: isMobile ? 24 : 32,
      width: '100%',
      maxWidth: 420,
      color: '#fff',
      boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
    }}>
      <h2 style={{
        margin: '0 0 8px 0',
        fontSize: isMobile ? '1.4rem' : '1.6rem',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        Welcome
      </h2>
      <p style={{
        margin: '0 0 24px 0',
        color: '#aaa',
        fontSize: '0.95rem',
        textAlign: 'center'
      }}>
        One account for League & Ladder
      </p>

      {message && (
        <div style={{
          background: 'rgba(220, 53, 69, 0.2)',
          border: '1px solid rgba(220, 53, 69, 0.5)',
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
          color: '#ff6b6b',
          fontSize: '0.9rem'
        }}>
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={handleContinueWithGoogle}
        disabled={loading}
        style={{
          width: '100%',
          padding: 16,
          background: '#fff',
          color: '#333',
          border: '1px solid #ddd',
          borderRadius: 10,
          fontSize: '1.05rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          opacity: loading ? 0.7 : 1,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
      >
        <img src="https://img.icons8.com/color/24/000000/google-logo.png" alt="" style={{ height: 24, width: 24 }} />
        {loading ? 'Signing in...' : 'Continue with Google'}
      </button>

      {onShowClaimFlow && (
        <p style={{
          margin: '20px 0 0 0',
          textAlign: 'center',
          fontSize: '0.9rem',
          color: '#aaa'
        }}>
          Already on the ladder?{' '}
          <button
            type="button"
            onClick={onShowClaimFlow}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
          >
            Claim your position
          </button>
        </p>
      )}

      <p style={{
        margin: '20px 0 0 0',
        fontSize: '0.8rem',
        color: '#888',
        textAlign: 'center'
      }}>
        New or returning – same button. Admin approval required for first-time signup.
      </p>
    </div>
  );
}
