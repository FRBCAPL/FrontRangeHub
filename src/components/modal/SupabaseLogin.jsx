import React, { useEffect, useState } from "react";
import supabaseAuthService from '../../services/supabaseAuthService.js';
import AuthServiceStatus from './AuthServiceStatus.jsx';

/**
 * Supabase Login - OAuth Only (Google/Facebook)
 * @param {function} onSuccess - callback when login succeeds
 * @param {function} onShowSignup - callback to show signup modal
 * @param {function} onShowClaim - callback to show claim ladder modal
 */
export default function SupabaseLogin({ onSuccess, onShowSignup, onShowClaim }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [authOutageNotice, setAuthOutageNotice] = useState("");
  const [isCheckingAuthStatus, setIsCheckingAuthStatus] = useState(false);
  const [lastAuthStatusCheckAt, setLastAuthStatusCheckAt] = useState(null);

  const runAuthOutageCheck = async ({ showChecking = true } = {}) => {
    if (showChecking) setIsCheckingAuthStatus(true);
    try {
      const status = await supabaseAuthService.checkAuthOutageStatus({ timeoutMs: 3500 });
      if (status?.hasIncident || status?.authReachable === false) {
        setAuthOutageNotice(supabaseAuthService.formatAuthOutageMessage(status));
        return;
      }
      setAuthOutageNotice("");
    } catch (_) {
      // Best effort only.
    } finally {
      setLastAuthStatusCheckAt(new Date());
      if (showChecking) setIsCheckingAuthStatus(false);
    }
  };

  useEffect(() => {
    runAuthOutageCheck();
    const timer = setInterval(() => runAuthOutageCheck({ showChecking: false }), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- Handle OAuth login ---
  const handleOAuthLogin = async (provider) => {
    if (isCheckingAuthStatus || isAuthDegraded) {
      setMessage('Auth service is not fully healthy yet. Please wait for status OK, then try again.');
      return;
    }
    setMessage("");
    setLoading(true);
    
    // Clear any Dues Tracker OAuth flag - this is Hub login, not Dues Tracker
    localStorage.removeItem('__DUES_TRACKER_OAUTH__');
    
    // Open popup synchronously on click so browsers don't block it (required when hub is in iframe)
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    const popupWindow = inIframe ? window.open('about:blank', '_blank') : null;
    if (inIframe && !popupWindow) setMessage('Please allow pop-ups for this site, then try again.');
    
    try {
      const result = await supabaseAuthService.signInWithOAuth(provider, { popupWindow });
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
  const isAuthDegraded = Boolean(authOutageNotice);
  const isOAuthDisabled = loading || isCheckingAuthStatus || isAuthDegraded;

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.82), rgba(43, 43, 43, 0.69))',
        border: '2px solid #e53e3e',
        borderRadius: isMobile ? '8px' : '15px',
        padding: isMobile ? '20px' : '30px',
        width: '100%',
        maxWidth: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 100px rgba(229, 62, 62, 0.3)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <AuthServiceStatus
          isDegraded={isAuthDegraded}
          isChecking={isCheckingAuthStatus}
          lastCheckedAt={lastAuthStatusCheckAt}
          onCheckNow={runAuthOutageCheck}
          isMobile={isMobile}
          notice={authOutageNotice}
        />
        {!isMobile && (
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{
              margin: '0 0 10px 0',
              fontSize: '2rem',
              color: '#ffffff',
              fontWeight: 'bold'
            }}>
              Welcome Back
            </h1>
            <p style={{
              margin: 0,
              color: '#cccccc',
              fontSize: '1rem'
            }}>
              Sign in with Google or Facebook
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

        {/* OAuth Buttons - Primary Login Method */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '12px' : '15px',
          marginBottom: '25px'
        }}>
          <button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={isOAuthDisabled}
            style={{
              width: '100%',
              padding: isMobile ? '14px' : '16px',
              background: '#ffffff',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: isMobile ? '8px' : '10px',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: '600',
              cursor: isOAuthDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              opacity: isOAuthDisabled ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isOAuthDisabled) {
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

          {onShowClaim && (
            <button
              type="button"
              onClick={onShowClaim}
              style={{
                width: '100%',
                padding: isMobile ? '10px' : '11px',
                background: 'transparent',
                color: '#7dd3fc',
                border: '1px solid rgba(125, 211, 252, 0.45)',
                borderRadius: isMobile ? '8px' : '10px',
                fontSize: isMobile ? '0.84rem' : '0.88rem',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Already on the ladder? Claim your position
            </button>
          )}
          
          <button
            type="button"
            onClick={() => handleOAuthLogin('facebook')}
            disabled={isOAuthDisabled}
            style={{
              width: '100%',
              padding: isMobile ? '14px' : '16px',
              background: '#1877F2',
              color: '#ffffff',
              border: 'none',
              borderRadius: isMobile ? '8px' : '10px',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: '600',
              cursor: isOAuthDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              opacity: isOAuthDisabled ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isOAuthDisabled) {
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
        </div>

        {/* Contact Admin Message */}
        <div style={{
          background: 'rgba(255, 152, 0, 0.1)',
          border: '1px solid rgba(255, 152, 0, 0.3)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h4 style={{ color: '#FF9800', marginTop: '0', marginBottom: '10px', fontSize: isMobile ? '0.95rem' : '1rem' }}>
            📧 Don't have Google or Facebook?
          </h4>
          <p style={{ color: '#ccc', marginBottom: '15px', fontSize: isMobile ? '0.8rem' : '0.9rem', lineHeight: '1.6' }}>
            Contact the admin to set up your account manually.
          </p>
          <a
            href="mailto:admin@frontrangepool.com"
            style={{
              color: '#FF9800',
              textDecoration: 'underline',
              fontWeight: 'bold',
              fontSize: isMobile ? '0.85rem' : '0.9rem'
            }}
          >
            admin@frontrangepool.com
          </a>
        </div>

        {/* Sign Up Button */}
        {onShowSignup && (
          <button
            type="button"
            onClick={onShowSignup}
            style={{
              width: '100%',
              padding: isMobile ? '14px' : '16px',
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              color: 'white',
              border: 'none',
              borderRadius: isMobile ? '8px' : '10px',
              fontSize: isMobile ? '0.95rem' : '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '10px',
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
