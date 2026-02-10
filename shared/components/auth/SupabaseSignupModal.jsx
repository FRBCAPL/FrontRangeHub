import React, { useState, useEffect } from 'react';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';
import supabaseAuthService from '@shared/services/services/supabaseAuthService.js';

const SHOW_FACEBOOK = false; // Hidden while not working; OAuth code kept for future use

const SupabaseSignupModal = ({ isOpen, onClose, claimingPlayer = null, containerSelector = null }) => {
  const [step, setStep] = useState(claimingPlayer ? 'claim' : 'check'); // 'check', 'checkName', 'new', 'claim', 'success'
  const [formData, setFormData] = useState({
    firstName: claimingPlayer?.firstName || '',
    lastName: claimingPlayer?.lastName || '',
    email: '',
    password: '',
    phone: '',
    fargoRate: claimingPlayer?.fargoRate || '400',
    ladderName: claimingPlayer?.ladderName || '499-under',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [existingPlayers, setExistingPlayers] = useState(null);

  // Update step and formData when claimingPlayer changes
  useEffect(() => {
    if (claimingPlayer) {
      setStep('claim');
      setFormData({
        firstName: claimingPlayer.firstName || '',
        lastName: claimingPlayer.lastName || '',
        phone: '',
        fargoRate: claimingPlayer.fargoRate || '400',
        ladderName: claimingPlayer.ladderName || '499-under',
        message: ''
      });
    } else {
      setStep('check');
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        fargoRate: '400',
        ladderName: '499-under',
        message: ''
      });
    }
  }, [claimingPlayer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOAuthSignup = async (provider) => {
    setError('');
    setLoading(true);
    
    // Hub/Ladder OAuth - ensure Dues Tracker flag is NOT set (Dues Tracker is separate, LOS only)
    localStorage.removeItem('__DUES_TRACKER_OAUTH__');
    
    // Store signup info in localStorage for OAuth callback
    const signupInfo = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      fargoRate: formData.fargoRate,
      ladderName: formData.ladderName,
      message: formData.message,
      isNewSignup: true
    };
    
    localStorage.setItem('pendingOAuthSignup', JSON.stringify(signupInfo));
    // Return to ladder after signup (signup modal is usually opened from ladder)
    const returnTo = typeof window !== 'undefined' ? (window.location.pathname || '/ladder') : '/ladder';
    localStorage.setItem('oauthReturnTo', returnTo.startsWith('/ladder') || returnTo.startsWith('/guest/ladder') ? returnTo : '/ladder');
    
    try {
      const result = await supabaseAuthService.signInWithOAuth(provider);
      if (!result.success) {
        setError(result.message || `Failed to sign in with ${provider}.`);
        setLoading(false);
        localStorage.removeItem('pendingOAuthSignup');
      }
      // OAuth redirects, so we don't set loading to false here
    } catch (error) {
      console.error(`${provider} OAuth error:`, error);
      setError(`Failed to sign in with ${provider}. Please try again.`);
      setLoading(false);
      localStorage.removeItem('pendingOAuthSignup');
    }
  };

  const handleEmailSignup = async (e) => {
    e?.preventDefault();
    if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim() || !formData.password) {
      setError('Please fill in first name, last name, email, and password.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await supabaseDataService.createNewPlayerSignup({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone || '',
        fargoRate: formData.fargoRate || '400',
        ladderName: formData.ladderName || '499-under',
        joinLadder: true
      });
      if (result.success) {
        setSuccessMessage(result.message || 'Account created! Check your email to confirm. Once approved by admin, you can log in.');
        setStep('success');
      } else {
        setError(result.error || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthClaim = async (provider) => {
    setError('');
    setLoading(true);
    
    // Hub/Ladder OAuth - ensure Dues Tracker flag is NOT set
    localStorage.removeItem('__DUES_TRACKER_OAUTH__');
    
    // Store claim info in localStorage
    const claimInfo = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      message: formData.message,
      position: existingPlayers?.[0]?.position || claimingPlayer?.position,
      ladderName: existingPlayers?.[0]?.ladder_name || claimingPlayer?.ladderName || '499-under',
      fargoRate: existingPlayers?.[0]?.fargo_rate || claimingPlayer?.fargoRate,
      isClaiming: true
    };
    
    localStorage.setItem('pendingClaim', JSON.stringify(claimInfo));
    const returnTo = typeof window !== 'undefined' ? (window.location.pathname || '/ladder') : '/ladder';
    localStorage.setItem('oauthReturnTo', returnTo.startsWith('/ladder') || returnTo.startsWith('/guest/ladder') ? returnTo : '/ladder');
    
    try {
      const result = await supabaseAuthService.signInWithOAuth(provider);
      if (!result.success) {
        setError(result.message || `Failed to sign in with ${provider}.`);
        setLoading(false);
        localStorage.removeItem('pendingClaim');
      }
      // OAuth redirects, so we don't set loading to false here
    } catch (error) {
      console.error(`${provider} OAuth error:`, error);
      setError(`Failed to sign in with ${provider}. Please try again.`);
      setLoading(false);
      localStorage.removeItem('pendingClaim');
    }
  };

  const handleCheckName = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      setError('Please enter both first and last name');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const result = await supabaseDataService.checkExistingPlayer(
        formData.firstName.trim(),
        formData.lastName.trim(),
        null
      );
      if (result.success && result.hasExistingPlayers && result.foundPlayers.length > 0) {
        const playerWithLadder = result.foundPlayers.find(p => 
          p.ladder_profiles && p.ladder_profiles.length > 0
        ) || result.foundPlayers[0];
        
        const ladderProfile = playerWithLadder.ladder_profiles?.[0];
        
        setExistingPlayers([{
          first_name: playerWithLadder.first_name,
          last_name: playerWithLadder.last_name,
          position: ladderProfile?.position || 999,
          ladder_name: ladderProfile?.ladder_name || '499-under',
          fargo_rate: ladderProfile?.fargo_rate || null,
          user_id: playerWithLadder.id
        }]);
        
        setFormData(prev => ({
          ...prev,
          firstName: playerWithLadder.first_name,
          lastName: playerWithLadder.last_name,
          fargoRate: ladderProfile?.fargo_rate || '400',
          ladderName: ladderProfile?.ladder_name || '499-under'
        }));
        setStep('claim');
      } else {
        setError('We couldn\'t find you on the ladder. Try "I\'m a New Player" instead.');
      }
    } catch (err) {
      setError('Error checking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderCheckStep = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ color: '#fff', marginBottom: '10px', textAlign: 'center' }}>Join the Ladder</h3>
      <p style={{ color: '#ccc', marginBottom: '30px', fontSize: '0.9rem', textAlign: 'center' }}>
        Choose how you want to join:
      </p>

      {error && (
        <div style={{
          background: 'rgba(220, 53, 69, 0.1)',
          border: '1px solid rgba(220, 53, 69, 0.3)',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
          color: '#dc3545'
        }}>
          {error}
        </div>
      )}

      {/* Two clear options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
        <button
          type="button"
          onClick={() => setStep('new')}
          style={{
            width: '100%',
            padding: '20px',
            background: '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}
        >
          <span style={{ fontSize: '2rem' }}>🆕</span>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>I'm a New Player</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Create a new account and join the ladder</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStep('checkName')}
          style={{
            width: '100%',
            padding: '20px',
            background: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}
        >
          <span style={{ fontSize: '2rem' }}>🎯</span>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>I'm Already on the Ladder</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Claim your existing position</div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderNewSignupStep = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ color: '#fff', marginBottom: '15px', textAlign: 'center' }}>🆕 New Player Signup</h3>
      <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '0.95rem', textAlign: 'center', lineHeight: '1.6' }}>
        Sign up with Google or email. Your account will be sent to admin for approval.
      </p>

      {error && (
        <div style={{
          background: 'rgba(220, 53, 69, 0.1)',
          border: '1px solid rgba(220, 53, 69, 0.3)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          color: '#dc3545'
        }}>
          {error}
        </div>
      )}

      {/* Google OAuth */}
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => handleOAuthSignup('google')}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: '#ffffff',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <img src="https://img.icons8.com/color/24/000000/google-logo.png" alt="Google" style={{ height: '24px' }} />
          Sign Up with Google
        </button>
        {SHOW_FACEBOOK && (
        <button
          type="button"
          onClick={() => handleOAuthSignup('facebook')}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: '#1877F2',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginTop: '12px'
          }}
        >
          <img src="https://img.icons8.com/color/24/000000/facebook-new.png" alt="Facebook" style={{ height: '24px' }} />
          Sign Up with Facebook
        </button>
        )}
      </div>

      {/* Divider */}
      <div style={{ textAlign: 'center', color: '#999', fontSize: '0.9rem', marginBottom: '15px' }}>— or sign up with email —</div>

      {/* Email Signup Form */}
      <form onSubmit={handleEmailSignup} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', color: '#fff', fontSize: '0.9rem' }}>First Name *</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
            placeholder="First name"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '2px solid #444',
              background: '#2a2a2a',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', color: '#fff', fontSize: '0.9rem' }}>Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
            placeholder="Last name"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '2px solid #444',
              background: '#2a2a2a',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', color: '#fff', fontSize: '0.9rem' }}>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '2px solid #444',
              background: '#2a2a2a',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', color: '#fff', fontSize: '0.9rem' }}>Password * (min 8 characters)</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            minLength={8}
            placeholder="Password"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '2px solid #444',
              background: '#2a2a2a',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !formData.firstName?.trim() || !formData.lastName?.trim() || !formData.email?.trim() || !formData.password || formData.password.length < 8}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#555' : 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Creating account...' : 'Sign Up with Email'}
        </button>
      </form>

      {/* Need Help */}
      <div style={{
        background: 'rgba(255, 152, 0, 0.1)',
        border: '1px solid rgba(255, 152, 0, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#ccc', margin: 0, fontSize: '0.85rem' }}>
          Need help? <a href="mailto:admin@frontrangepool.com" style={{ color: '#FF9800', textDecoration: 'underline', fontWeight: 'bold' }}>Contact admin</a>
        </p>
      </div>

      {/* What happens next */}
      <div style={{ 
        background: 'rgba(76, 175, 80, 0.1)', 
        border: '1px solid rgba(76, 175, 80, 0.3)', 
        padding: '15px', 
        borderRadius: '6px', 
        marginTop: '20px',
        fontSize: '0.85rem',
        color: '#ccc'
      }}>
        <strong style={{ color: '#4CAF50' }}>What happens next?</strong>
        <ol style={{ margin: '10px 0 0 20px', padding: 0, lineHeight: '1.8' }}>
          <li>Your account will be created (email signup) or linked (Google)</li>
          <li>Admin will approve your account (usually within 24 hours)</li>
          <li>You'll receive an email once approved</li>
          <li>Log in with email or Google to access the ladder!</li>
        </ol>
      </div>

      <button
        type="button"
        onClick={() => setStep('check')}
        style={{
          width: '100%',
          marginTop: '20px',
          padding: '12px',
          background: 'transparent',
          color: '#fff',
          border: '2px solid #666',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '500'
        }}
      >
        ← Back
      </button>
    </div>
  );

  const renderCheckNameStep = () => (
    <form onSubmit={handleCheckName} style={{ padding: '20px' }}>
      <h3 style={{ color: '#fff', marginBottom: '10px', textAlign: 'center' }}>🎯 Check Your Name</h3>
      <p style={{ color: '#ccc', marginBottom: '25px', fontSize: '0.95rem', textAlign: 'center' }}>
        Enter your name as it appears on the ladder to find your position
      </p>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#fff', fontWeight: 'bold' }}>
          First Name *
        </label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          required
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '6px',
            border: '2px solid #444',
            background: '#2a2a2a',
            color: '#fff',
            fontSize: '1rem'
          }}
          placeholder="Enter your first name"
          autoFocus
        />
      </div>

      <div style={{ marginBottom: '25px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#fff', fontWeight: 'bold' }}>
          Last Name *
        </label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          required
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '6px',
            border: '2px solid #444',
            background: '#2a2a2a',
            color: '#fff',
            fontSize: '1rem'
          }}
          placeholder="Enter your last name"
        />
      </div>

      {error && (
        <div style={{
          background: 'rgba(220, 53, 69, 0.1)',
          border: '1px solid rgba(220, 53, 69, 0.3)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          color: '#dc3545'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={() => setStep('check')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'transparent',
            color: '#fff',
            border: '2px solid #666',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={loading || !formData.firstName || !formData.lastName}
          style={{
            flex: 2,
            padding: '14px',
            background: loading || !formData.firstName || !formData.lastName ? '#666' : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !formData.firstName || !formData.lastName ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            boxShadow: loading || !formData.firstName || !formData.lastName ? 'none' : '0 4px 15px rgba(0, 123, 255, 0.4)'
          }}
        >
          {loading ? 'Checking...' : '🔍 Find My Position'}
        </button>
      </div>
    </form>
  );

  const renderClaimStep = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{ color: '#fff', marginBottom: '15px', textAlign: 'center' }}>
        🎯 Claim Your Ladder Position
      </h3>
      
      {(claimingPlayer || (existingPlayers && existingPlayers.length > 0) || (formData.firstName && formData.lastName)) && (
        <div style={{ 
          background: 'rgba(76, 175, 80, 0.1)', 
          border: '2px solid #4CAF50', 
          borderRadius: '8px', 
          padding: '15px', 
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4CAF50', marginBottom: '5px' }}>
            {formData.firstName} {formData.lastName}
          </div>
          {existingPlayers && existingPlayers.length > 0 && (
            <>
              <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
                Position #{existingPlayers[0].position} • {existingPlayers[0].ladder_name || '499-under'} Ladder
              </div>
              {existingPlayers[0].fargo_rate && (
                <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '5px' }}>
                  Fargo: {existingPlayers[0].fargo_rate}
                </div>
              )}
            </>
          )}
          {claimingPlayer && (!existingPlayers || existingPlayers.length === 0) && (
            <>
              <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
                Position #{claimingPlayer.position} • {claimingPlayer.ladderName || '499-under'} Ladder
              </div>
              {claimingPlayer.fargoRate && (
                <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '5px' }}>
                  Fargo: {claimingPlayer.fargoRate}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <p style={{ color: '#ccc', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.6', textAlign: 'center' }}>
        Sign in with Google to claim this position instantly.
      </p>

      {error && (
        <div style={{
          background: 'rgba(220, 53, 69, 0.1)',
          border: '1px solid rgba(220, 53, 69, 0.3)',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px',
          color: '#dc3545'
        }}>
          {error}
        </div>
      )}

      {/* OAuth Buttons for Claiming */}
      <div style={{ 
        marginBottom: '25px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <button
          type="button"
          onClick={() => handleOAuthClaim('google')}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: '#ffffff',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <img src="https://img.icons8.com/color/24/000000/google-logo.png" alt="Google" style={{ height: '24px' }} />
          Claim with Google
        </button>
        {SHOW_FACEBOOK && (
        <button
          type="button"
          onClick={() => handleOAuthClaim('facebook')}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: '#1877F2',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <img src="https://img.icons8.com/color/24/000000/facebook-new.png" alt="Facebook" style={{ height: '24px' }} />
          Claim with Facebook
        </button>
        )}
      </div>

      {/* Contact Admin Message */}
      <div style={{
        background: 'rgba(255, 152, 0, 0.1)',
        border: '1px solid rgba(255, 152, 0, 0.3)',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '25px',
        textAlign: 'center'
      }}>
        <h4 style={{ color: '#FF9800', marginTop: '0', marginBottom: '10px' }}>📧 Don't have Google?</h4>
        <p style={{ color: '#ccc', marginBottom: '15px', fontSize: '0.9rem', lineHeight: '1.6' }}>
          Contact the admin to claim your position manually.
        </p>
        <a
          href="mailto:admin@frontrangepool.com"
          style={{
            color: '#FF9800',
            textDecoration: 'underline',
            fontWeight: 'bold'
          }}
        >
          admin@frontrangepool.com
        </a>
      </div>

      {/* What happens next */}
      <div style={{ 
        background: 'rgba(76, 175, 80, 0.1)', 
        border: '1px solid rgba(76, 175, 80, 0.3)', 
        padding: '15px', 
        borderRadius: '6px', 
        marginTop: '20px',
        fontSize: '0.85rem',
        color: '#ccc'
      }}>
        <strong style={{ color: '#4CAF50' }}>What happens next?</strong>
        <ol style={{ margin: '10px 0 0 20px', padding: 0, lineHeight: '1.8' }}>
          <li>Sign in with Google</li>
          <li>Your position will be claimed automatically</li>
          <li>Admin will approve your claim (usually within 24 hours)</li>
          <li>You'll receive an email once approved</li>
          <li>Log in with Google or email on the Hub to access the ladder!</li>
        </ol>
      </div>

      <button
        type="button"
        onClick={() => setStep('check')}
        style={{
          width: '100%',
          marginTop: '20px',
          padding: '12px',
          background: 'transparent',
          color: '#fff',
          border: '2px solid #666',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '500'
        }}
      >
        ← Back
      </button>
    </div>
  );

  const renderSuccessStep = () => (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
      <h3 style={{ color: '#4CAF50', marginBottom: '15px' }}>Success!</h3>
      <p style={{ color: '#ccc', marginBottom: '25px', fontSize: '1rem', lineHeight: '1.6' }}>
        {successMessage || 'Your request has been submitted successfully!'}
      </p>
      <div style={{ 
        background: 'rgba(76, 175, 80, 0.1)', 
        border: '1px solid rgba(76, 175, 80, 0.3)', 
        borderRadius: '8px', 
        padding: '20px', 
        marginBottom: '25px',
        textAlign: 'left'
      }}>
        <h4 style={{ color: '#4CAF50', marginTop: '0', marginBottom: '15px' }}>📧 Next Steps:</h4>
        <ol style={{ color: '#ccc', lineHeight: '1.8', margin: '0', paddingLeft: '20px' }}>
          <li><strong>Wait for approval</strong> - Admin will approve your account (usually within 24 hours)</li>
          <li><strong>Check your email</strong> - You'll receive an email once approved</li>
          <li><strong>Log in</strong> - Use email or Google to log in</li>
        </ol>
      </div>

      <button
        onClick={onClose}
        style={{
          padding: '14px 28px',
          background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '1rem',
          boxShadow: '0 4px 15px rgba(0, 123, 255, 0.4)'
        }}
      >
        Got it! Close
      </button>
    </div>
  );

  return (
    <DraggableModal
      open={isOpen}
      onClose={onClose}
      title={step === 'success' ? '' : '🎯 Join the Ladder'}
      maxWidth="600px"
      containerSelector={containerSelector || null}
    >
      {step === 'check' && renderCheckStep()}
      {step === 'checkName' && renderCheckNameStep()}
      {step === 'new' && renderNewSignupStep()}
      {step === 'claim' && renderClaimStep()}
      {step === 'success' && renderSuccessStep()}
    </DraggableModal>
  );
};

export default SupabaseSignupModal;
