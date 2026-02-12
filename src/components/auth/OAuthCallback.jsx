import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabaseAuthService from '../../services/supabaseAuthService.js';
import { supabase } from '../../config/supabase';

/**
 * OAuth Callback Handler
 * Handles OAuth redirects from Google, Facebook, etc.
 */
const OAuthCallback = ({ onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // IMMEDIATE check - only redirect to Dues Tracker when the user explicitly started
    // OAuth from Dues Tracker. Do NOT use "!supabaseAuth" as a signal: we clear
    // supabaseAuth before every OAuth (Hub and Duezy), so it would wrongly send
    // Hub Google logins to the Dues Tracker and break Hub login.
    const isDuesTrackerOAuth = localStorage.getItem('__DUES_TRACKER_OAUTH__') === 'true';
    
    if (isDuesTrackerOAuth) {
      console.log('🚨 OAuth callback is for Dues Tracker - redirecting (flag was set)');
      localStorage.removeItem('__DUES_TRACKER_OAUTH__');
      const hash = window.location.hash || '';
      const duesTrackerUrl = window.location.origin + '/dues-tracker/index.html' + hash;
      window.location.replace(duesTrackerUrl);
      return;
    }
    
    let isProcessing = false; // Prevent multiple executions
    
    const handleOAuthCallback = async () => {
      // Prevent multiple executions
      if (isProcessing) {
        console.log('⏸️ OAuth callback already processing, skipping...');
        return;
      }
      
      isProcessing = true;
      
      try {
        console.log('🔄 Handling OAuth callback...');
        console.log('🔍 Current pathname:', window.location.pathname);
        console.log('🔍 Current hash:', window.location.hash);
        
        // Check if this is for claiming a position or new signup
        const pendingClaim = localStorage.getItem('pendingClaim');
        const claimInfo = pendingClaim ? JSON.parse(pendingClaim) : null;
        
        const pendingSignup = localStorage.getItem('pendingOAuthSignup');
        const signupInfo = pendingSignup ? JSON.parse(pendingSignup) : null;
        
        const result = await supabaseAuthService.handleOAuthCallback();
        
        // New signup pending approval - show success message, not error
        if (result.requiresApproval && result.user) {
          setLoading(false);
          setSuccess(false);
          setError('');
          setPendingApproval(true);
          setTimeout(() => {
            navigate('/', { replace: true, state: { signupSuccess: true, message: result.message } });
          }, 5000);
          return;
        }
        
        if (result.success) {
          // If we were opened in a new tab from the hub (iframe), notify opener and close so user returns to hub with session
          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'OAUTH_COMPLETE' }, window.location.origin);
            } catch (e) {
              console.warn('postMessage to opener failed', e);
            }
            setLoading(false);
            setSuccess(true);
            setTimeout(() => window.close(), 2000);
            return;
          }
          console.log('✅ OAuth authentication successful');
          console.log('📋 OAuth result details:', {
            success: result.success,
            requiresApproval: result.requiresApproval,
            isNewUser: result.isNewUser,
            hasUser: !!result.user,
            userType: result.userType,
            userEmail: result.user?.email
          });
          
          // If claiming a position, handle the claim
          if (claimInfo && claimInfo.isClaiming) {
            console.log('🎯 Processing position claim via OAuth...');
            
            try {
              const supabaseDataService = (await import('../../services/supabaseDataService.js')).default;
              const claimResult = await supabaseDataService.claimLadderPositionWithOAuth({
                firstName: claimInfo.firstName,
                lastName: claimInfo.lastName,
                email: result.user.email, // Use OAuth email
                phone: claimInfo.phone || '',
                message: claimInfo.message || '',
                userId: result.user.id // OAuth user ID
              });
              
              localStorage.removeItem('pendingClaim');
              
              if (claimResult.success) {
                // Claim successful - show success and redirect
                setMessage('✅ Position claimed successfully! Redirecting...');
                setTimeout(() => {
                  if (onSuccess) {
                    onSuccess(
                      `${result.user.first_name} ${result.user.last_name}`.trim(),
                      result.user.email,
                      'oauth',
                      result.userType,
                      '',
                      result.user
                    );
                  } else {
                    navigate('/hub');
                  }
                }, 2000);
                return;
              } else {
                throw new Error(claimResult.error || 'Failed to claim position');
              }
            } catch (claimError) {
              console.error('❌ Claim error:', claimError);
              localStorage.removeItem('pendingClaim');
              setError(claimError.message || 'Failed to claim position. Please try again.');
              setTimeout(() => {
                navigate('/');
              }, 3000);
              return;
            }
          }
          
          // If this is a new signup, create the ladder profile
          if (signupInfo && signupInfo.isNewSignup) {
            console.log('🆕 Processing new player signup via OAuth...');
            
            try {
              const supabaseDataService = (await import('../../services/supabaseDataService.js')).default;
              // User already exists from OAuth, just create ladder profile
              const { supabase } = await import('../../config/supabase.js');
              
              // Check if ladder profile already exists
              const { data: existingProfile } = await supabase
                .from('ladder_profiles')
                .select('*')
                .eq('user_id', result.user.id)
                .single();
              
              if (!existingProfile) {
                // Create ladder profile for new OAuth user
                const { error: profileError } = await supabase
                  .from('ladder_profiles')
                  .insert({
                    user_id: result.user.id,
                    ladder_name: signupInfo.ladderName || '499-under',
                    position: 999, // Temporary position, admin will assign real one
                    fargo_rate: parseInt(signupInfo.fargoRate) || 400,
                    is_active: false // Will be activated after admin approval
                  });
                
                if (profileError) {
                  console.error('❌ Error creating ladder profile:', profileError);
                } else {
                  console.log('✅ Ladder profile created for new OAuth user');
                }
              }
              
              localStorage.removeItem('pendingOAuthSignup');
            } catch (signupError) {
              console.error('❌ Signup error:', signupError);
              localStorage.removeItem('pendingOAuthSignup');
              // Continue anyway - user account was created by OAuth
            }
          }
          
          // If user is approved, proceed with login
          console.log('✅ User is approved - proceeding with login');
          
          if (onSuccess) {
            // Ensure we have a valid name (not just "User Name")
            const firstName = result.user.first_name || result.user.email?.split('@')[0] || 'User';
            const lastName = result.user.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim() || firstName;
            
            console.log('✅ OAuth login success, calling onSuccess with:', {
              name: fullName,
              email: result.user.email,
              firstName,
              lastName,
              userType: result.userType,
              userData: result.user
            });
            
            // Make sure we have a valid userType (default to 'user' if not set)
            const userType = result.userType || 'user';
            
            // Get a token if available (Supabase session token)
            let token = '';
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.access_token) {
                token = session.access_token;
              }
            } catch (tokenError) {
              console.log('Could not get session token:', tokenError);
            }
            
            console.log('📝 Calling onSuccess with complete data:', {
              fullName,
              email: result.user.email,
              userType,
              hasToken: !!token,
              userDataKeys: Object.keys(result.user || {})
            });
            
            // Call onSuccess to store data in App.jsx state
            onSuccess(
              fullName,
              result.user.email,
              '', // No PIN for OAuth users
              userType,
              token,
              result.user
            );
            
            // Also ensure Supabase auth service has stored the data
            console.log('✅ OAuth login complete - user should be authenticated');
            
            // Show success message briefly, then redirect to hub
            setLoading(false);
            setSuccess(true);
            setTimeout(() => {
              navigate('/hub', { replace: true });
            }, 2000);
          } else {
            // Redirect to hub if no callback provided
            navigate('/hub');
          }
        } else {
          console.error('❌ OAuth callback failed:', result.message);
          localStorage.removeItem('pendingClaim');
          setError(result.message || 'Authentication failed. Please try again.');
          setTimeout(() => {
            navigate('/');
          }, 3000);
        }
      } catch (err) {
        console.error('❌ OAuth callback error:', err);
        localStorage.removeItem('pendingClaim');
        setError('An error occurred during authentication. Please try again.');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } finally {
        setLoading(false);
        isProcessing = false; // Reset flag
      }
    };

    handleOAuthCallback();
    
    // Cleanup function
    return () => {
      isProcessing = false;
    };
  }, [navigate, onSuccess]);

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
        {loading ? (
          <>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#333'
            }}>
              Authenticating...
            </h1>
            <p style={{ color: '#666' }}>
              Please wait while we complete your sign in...
            </p>
            <div style={{
              marginTop: '30px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </>
        ) : success ? (
          <>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#28a745'
            }}>
              ✅ Login Successful!
            </h1>
            <p style={{ color: '#666', marginBottom: '10px' }}>
              Welcome back! You've been successfully logged in with Google.
            </p>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Redirecting you to the hub...
            </p>
            <div style={{
              marginTop: '30px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #28a745',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
          </>
        ) : pendingApproval ? (
          <>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#28a745'
            }}>
              ✅ Account Created!
            </h1>
            <p style={{ color: '#666', marginBottom: '16px', lineHeight: 1.5 }}>
              Your account has been created successfully.
            </p>
            <p style={{ color: '#333', fontWeight: 'bold', marginBottom: '12px' }}>
              ⏳ Next steps:
            </p>
            <p style={{ color: '#666', marginBottom: '16px', fontSize: '0.95rem', lineHeight: 1.6, textAlign: 'left' }}>
              1. An admin will review your application (usually within 24 hours)<br />
              2. You'll receive an approval email when you're approved<br />
              3. Log in with Google again to access the ladder
            </p>
            <p style={{ color: '#888', fontSize: '0.9rem' }}>
              Redirecting you to the home page...
            </p>
          </>
        ) : error ? (
          <>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#dc3545'
            }}>
              Authentication Failed
            </h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Go to Login
            </button>
          </>
        ) : (
          <>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#333'
            }}>
              Account Created!
            </h1>
            <p style={{ color: '#666', marginBottom: '10px' }}>
              Your account has been created successfully.
            </p>
            <p style={{ color: '#ff9800', fontWeight: 'bold', marginBottom: '20px' }}>
              ⏳ Your account is pending admin approval.
            </p>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              You will be redirected to the login page shortly...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;

