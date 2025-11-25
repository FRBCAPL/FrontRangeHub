import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../config/supabase';

const ConfirmEmail = () => {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get tokens from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('Email confirmation - Type:', type);
        console.log('Email confirmation - Has tokens:', !!accessToken);

        if (type === 'signup' && accessToken && refreshToken) {
          // Set the session to confirm the email
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            throw sessionError;
          }

          if (data.session && data.user) {
            console.log('✅ Email confirmed for:', data.user.email);
            setMessage('✅ Email confirmed successfully! Your account is now pending admin approval. You\'ll receive a password setup email once approved.');
            
            // Sign out immediately (they can't log in until approved anyway)
            await supabase.auth.signOut();
            
            // Redirect to home after 5 seconds
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 5000);
          } else {
            throw new Error('Failed to confirm email');
          }
        } else {
          // No tokens or wrong type - might already be confirmed or link expired
          setError('Invalid or expired confirmation link. If you\'ve already confirmed your email, you can close this page. Your account is pending admin approval.');
        }
      } catch (err) {
        console.error('Email confirmation error:', err);
        setError(err.message || 'Failed to confirm email. Please try again or contact support.');
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>
          {loading ? '⏳' : error ? '❌' : '✅'}
        </div>
        
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#333'
        }}>
          {loading ? 'Confirming Your Email...' : error ? 'Confirmation Error' : 'Email Confirmed!'}
        </h1>

        {loading && (
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Please wait while we confirm your email address...
          </p>
        )}

        {error && (
          <>
            <div style={{
              background: '#fee',
              border: '1px solid #fcc',
              color: '#c33',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
              textAlign: 'left'
            }}>
              {error}
            </div>
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
              textAlign: 'left'
            }}>
              <strong>What to do next:</strong>
              <ol style={{ margin: '10px 0 0 20px', padding: 0 }}>
                <li>If you've already confirmed your email, you can close this page</li>
                <li>Your account is pending admin approval</li>
                <li>You'll receive a password setup email once approved</li>
                <li>If you need help, contact the administrator</li>
              </ol>
            </div>
          </>
        )}

        {message && (
          <>
            <div style={{
              background: '#efe',
              border: '1px solid #cfc',
              color: '#3c3',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {message}
            </div>
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
              textAlign: 'left'
            }}>
              <strong>What happens next:</strong>
              <ol style={{ margin: '10px 0 0 20px', padding: 0 }}>
                <li>✅ Your email is confirmed</li>
                <li>⏳ Admin will review and approve your account (usually within 24 hours)</li>
                <li>📧 You'll receive a password setup email once approved</li>
                <li>🔑 Set your password and log in!</li>
              </ol>
            </div>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '20px' }}>
              Redirecting to home page in 5 seconds...
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            color: '#667eea',
            border: '1px solid #667eea',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Go to Home Page
        </button>
      </div>
    </div>
  );
};

export default ConfirmEmail;

