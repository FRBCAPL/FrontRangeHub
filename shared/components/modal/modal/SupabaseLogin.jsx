import React, { useState } from "react";
import supabaseAuthService from '@shared/services/services/supabaseAuthService.js';

const SHOW_FACEBOOK = false; // Hidden while not working; OAuth code kept for future use

/**
 * Supabase Login - Google OAuth + Email/Password
 * @param {function} onSuccess - callback when login succeeds
 * @param {function} onShowSignup - callback to show signup modal
 * @param {boolean} compact - use tighter layout (e.g. when on pool table overlay)
 */
export default function SupabaseLogin({ onSuccess, onShowSignup, compact = false }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // --- Handle email/password login ---
  const handleEmailLogin = async (e) => {
    e?.preventDefault();
    if (!email?.trim() || !password) {
      setMessage("Please enter email and password.");
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      const result = await supabaseAuthService.signIn(email.trim(), password);
      if (result.success) {
        setMessage("✅ Signing you in...");
        onSuccess?.(result.user);
      } else {
        setMessage(result.message || "Sign in failed. Please try again.");
      }
    } catch (err) {
      setMessage("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Handle OAuth login ---
  const handleOAuthLogin = async (provider) => {
    setMessage("");
    setLoading(true);
    
    // Clear any Dues Tracker OAuth flag - this is Hub login, not Dues Tracker
    localStorage.removeItem('__DUES_TRACKER_OAUTH__');
    
    // Store where to return after OAuth (hub, ladder, etc.)
    const returnTo = typeof window !== 'undefined' ? (window.location.pathname || '/hub') : '/hub';
    localStorage.setItem('oauthReturnTo', returnTo || '/hub');
    
    try {
      const result = await supabaseAuthService.signInWithOAuth(provider);
      if (!result.success) {
        setMessage(result.message || `Failed to sign in with ${provider}.`);
        setLoading(false);
      }
      // OAuth redirects, so we don't set loading to false here
    } catch (error) {
      console.error(`${provider} OAuth error:`, error);
      setMessage(`Failed to sign in with ${provider}. Please try again.`);
      setLoading(false);
    }
  };

  const isMobile = window.innerWidth <= 768;
  const tight = compact || isMobile;

  const googleButton = (
    <button
      type="button"
      onClick={() => handleOAuthLogin('google')}
      disabled={loading}
      style={{
        width: '100%',
        padding: tight ? (isMobile ? '12px' : '10px 14px') : (isMobile ? '14px' : '16px'),
        background: '#ffffff',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: isMobile ? '8px' : '10px',
        fontSize: isMobile ? '0.9rem' : '1rem',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        opacity: loading ? 0.6 : 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}
    >
      <img src="https://img.icons8.com/color/24/000000/google-logo.png" alt="Google" style={{ height: '24px', width: '24px' }} />
      Continue with Google
    </button>
  );

  const emailForm = (
    <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: tight ? '6px' : (isMobile ? '12px' : '15px') }}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        style={{
          width: '100%',
          padding: tight ? '8px 10px' : (isMobile ? '12px 14px' : '14px 16px'),
          borderRadius: isMobile ? '8px' : '10px',
          border: '2px solid #444',
          background: '#2a2a2a',
          color: '#fff',
          fontSize: compact ? '0.85rem' : (isMobile ? '0.95rem' : '1rem')
        }}
      />
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: tight ? '8px 44px 8px 10px' : (isMobile ? '12px 44px 12px 14px' : '14px 44px 14px 16px'),
            borderRadius: isMobile ? '8px' : '10px',
            border: '2px solid #444',
            background: '#2a2a2a',
            color: '#fff',
            fontSize: compact ? '0.85rem' : (isMobile ? '0.95rem' : '1rem')
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '0.9rem'
          }}
        >
          {showPassword ? '🙈' : '👁'}
        </button>
      </div>
      <button
        type="submit"
        disabled={loading || !email?.trim() || !password}
        style={{
          width: '100%',
          padding: tight ? '8px 10px' : (isMobile ? '14px' : '16px'),
          background: loading || !email?.trim() || !password ? '#555' : 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: isMobile ? '8px' : '10px',
          fontSize: compact ? '0.85rem' : (isMobile ? '0.9rem' : '1rem'),
          fontWeight: '600',
          cursor: loading || !email?.trim() || !password ? 'not-allowed' : 'pointer',
          opacity: loading || !email?.trim() || !password ? 0.6 : 1
        }}
      >
        {loading ? 'Signing in...' : 'Sign in with Email'}
      </button>
    </form>
  );

  if (compact && !isMobile) {
    return (
      <div style={{ width: '100%' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.92), rgba(43, 43, 43, 0.85))',
          border: '2px solid #e53e3e',
          borderRadius: '12px',
          padding: '12px 20px',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 60px rgba(229, 62, 62, 0.2)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: '20px',
          minHeight: 0
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <h2 style={{ margin: '0 0 2px 0', fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>Welcome Back</h2>
              <p style={{ margin: 0, color: '#ccc', fontSize: '0.85rem' }}>Sign in with Google or email</p>
            </div>
            {googleButton}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '20px' }}>
            {message && (
              <div style={{
                background: message.includes('✅') ? 'rgba(76, 175, 80, 0.2)' : 'rgba(220, 53, 69, 0.2)',
                border: `1px solid ${message.includes('✅') ? 'rgba(76, 175, 80, 0.5)' : 'rgba(220, 53, 69, 0.5)'}`,
                padding: '8px 12px',
                borderRadius: '6px',
                color: message.includes('✅') ? '#4CAF50' : '#dc3545',
                fontSize: '0.85rem',
                marginBottom: '10px'
              }}>
                {message}
              </div>
            )}
            <div style={{ marginBottom: '8px' }}>
              {emailForm}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#999' }}>
              <a href="mailto:admin@frontrangepool.com" style={{ color: '#FF9800', textDecoration: 'underline' }}>Need help?</a>
            </p>
            {onShowSignup && (
              <button
                type="button"
                onClick={onShowSignup}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                🚀 New User? Sign Up
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.82), rgba(43, 43, 43, 0.69))',
        border: '2px solid #e53e3e',
        borderRadius: isMobile ? '8px' : '15px',
        padding: tight ? (isMobile ? '20px' : '16px 20px') : '30px',
        width: '100%',
        maxWidth: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 100px rgba(229, 62, 62, 0.3)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        {!isMobile && (
          <div style={{ textAlign: 'center', marginBottom: tight ? '12px' : '30px' }}>
            <h1 style={{
              margin: '0 0 4px 0',
              fontSize: compact ? '1.4rem' : '2rem',
              color: '#ffffff',
              fontWeight: 'bold'
            }}>
              Welcome Back
            </h1>
            <p style={{
              margin: 0,
              color: '#cccccc',
              fontSize: compact ? '0.9rem' : '1rem'
            }}>
              Sign in with Google or email
            </p>
          </div>
        )}

        {message && (
          <div style={{
            background: message.includes('✅') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(220, 53, 69, 0.1)',
            border: `1px solid ${message.includes('✅') ? 'rgba(76, 175, 80, 0.3)' : 'rgba(220, 53, 69, 0.3)'}`,
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            color: message.includes('✅') ? '#4CAF50' : '#dc3545',
            fontSize: isMobile ? '0.85rem' : '0.9rem',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: tight ? '8px' : (isMobile ? '12px' : '15px'), marginBottom: tight ? '12px' : '25px' }}>
          {googleButton}
          {SHOW_FACEBOOK && (
          <button
            type="button"
            onClick={() => handleOAuthLogin('facebook')}
            disabled={loading}
            style={{
              width: '100%',
              padding: tight ? (isMobile ? '12px' : '10px 14px') : (isMobile ? '14px' : '16px'),
              background: '#1877F2',
              color: '#ffffff',
              border: 'none',
              borderRadius: isMobile ? '8px' : '10px',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              opacity: loading ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(24, 119, 242, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <img src="https://img.icons8.com/color/24/000000/facebook-new.png" alt="Facebook" style={{ height: '24px', width: '24px' }} />
            Continue with Facebook
          </button>
          )}
        </div>

        <div style={{ marginBottom: tight ? '8px' : '20px', textAlign: 'center', color: '#999', fontSize: compact ? '0.8rem' : '0.9rem' }}>— or sign in with email —</div>
        {emailForm}
        <div style={{
          background: 'rgba(255, 152, 0, 0.1)',
          border: '1px solid rgba(255, 152, 0, 0.3)',
          borderRadius: '8px',
          padding: tight ? '10px 12px' : '16px',
          marginBottom: tight ? '10px' : '20px',
          marginTop: tight ? '8px' : '15px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#ccc', margin: 0, fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
            Need help? <a href="mailto:admin@frontrangepool.com" style={{ color: '#FF9800', textDecoration: 'underline', fontWeight: 'bold' }}>Contact admin</a>
          </p>
        </div>

        {onShowSignup && (
          <button
            type="button"
            onClick={onShowSignup}
            style={{
              width: '100%',
              padding: tight ? (isMobile ? '12px' : '10px 14px') : (isMobile ? '14px' : '16px'),
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              color: 'white',
              border: 'none',
              borderRadius: isMobile ? '8px' : '10px',
              fontSize: tight ? (isMobile ? '0.9rem' : '0.95rem') : (isMobile ? '0.95rem' : '1.1rem'),
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: tight ? '6px' : '10px',
              boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.4)';
            }}
          >
            🚀 New User? Sign Up Here
          </button>
        )}
      </div>
    </div>
  );
}
