import React, { useState } from "react";
import PlayerRegistrationModal from "./PlayerRegistrationModal";
import supabaseAuthService from '../../services/supabaseAuthService.js';

/**
 * Supabase Login - Email/password authentication
 * @param {function} onSuccess - callback when login succeeds
 */
export default function SupabaseLogin({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  // Debug log to confirm component is rendering
  console.log('SupabaseLogin component is rendering');

  // --- Handle login with Supabase ---
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setMessage("Please enter both email and password.");
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      const result = await supabaseAuthService.signIn(email.trim(), password);
      
      if (result.success) {
        setMessage("");
        
        // Store auth data
        supabaseAuthService.storeAuthData(result.user, result.userType);
        
        // Pass user data to parent component
        onSuccess(
          `${result.user.first_name} ${result.user.last_name}`.trim(),
          result.user.email,
          'supabase-auth', // Use a placeholder for Supabase auth
          result.userType,
          '', // No token needed for Supabase
          result.user // Complete user data
        );
      } else {
        setMessage(result.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Handle password reset ---
  const handleForgotPassword = async () => {
    const resetEmail = prompt('Enter your email address to reset your password:');
    if (!resetEmail) return;

    try {
      const { error } = await supabaseAuthService.resetPassword(resetEmail);
      if (error) {
        setMessage('Error sending reset email: ' + error.message);
      } else {
        setMessage('✅ Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.82), rgba(43, 43, 43, 0.69))',
        border: '2px solid #e53e3e',
        borderRadius: isMobile ? '8px' : '15px',
        padding: isMobile ? '6px' : '20px',
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 100px rgba(229, 62, 62, 0.3)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
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
                Sign in with your email and password
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'row', gap: isMobile ? '8px' : '15px', alignItems: 'end', width: '100%' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="email" style={{
                display: 'block',
                marginBottom: isMobile ? '3px' : '5px',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.7rem' : '1rem'
              }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '6px' : '10px',
                  border: '2px solid #444',
                  borderRadius: isMobile ? '4px' : '6px',
                  background: '#333',
                  color: '#ffffff',
                  fontSize: isMobile ? '0.8rem' : '1rem',
                  boxSizing: 'border-box'
                }}
                placeholder="Email"
                required
                disabled={loading}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label htmlFor="password" style={{
                display: 'block',
                marginBottom: isMobile ? '3px' : '5px',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.7rem' : '1rem'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: isMobile ? '6px 30px 6px 6px' : '10px 35px 10px 10px',
                    border: '2px solid #444',
                    borderRadius: isMobile ? '4px' : '6px',
                    background: '#333',
                    color: '#ffffff',
                    fontSize: isMobile ? '0.8rem' : '1rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: isMobile ? '-12px' : '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: isMobile ? '1.2rem' : '1rem',
                    padding: isMobile ? '8px' : '4px',
                    minWidth: isMobile ? '44px' : 'auto',
                    minHeight: isMobile ? '44px' : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: isMobile ? '0' : 'initial' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: isMobile ? '4px 4px' : '12px 25px',
                  background: loading ? '#666' : '#e53e3e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: isMobile ? '4px' : '8px',
                  fontSize: isMobile ? '0.7rem' : '1.1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  width: isMobile ? '100%' : 'auto',
                  height: isMobile ? '24px' : 'auto',
                  minHeight: isMobile ? '24px' : 'auto',
                  maxHeight: isMobile ? '24px' : 'auto'
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>

          </form>

          {/* Links */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: isMobile ? '8px' : '10px', 
            fontSize: isMobile ? '0.75rem' : '0.8rem',
            flexWrap: 'wrap',
            gap: isMobile ? '8px' : '0'
          }}>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: isMobile ? '0.75rem' : '0.8rem',
                padding: isMobile ? '4px' : '0'
              }}
            >
              Forgot Password?
            </button>
            <button
              type="button"
              onClick={() => setShowRegistration(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#e53e3e',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: isMobile ? '0.75rem' : '0.8rem',
                padding: isMobile ? '4px' : '0'
              }}
            >
              Contact Admin
            </button>
          </div>

        </div>

      {/* Registration Modal */}
      {showRegistration && (
        <PlayerRegistrationModal
          onClose={() => setShowRegistration(false)}
          onSuccess={() => {
            setShowRegistration(false);
            setMessage("Registration submitted! Please wait for admin approval.");
          }}
        />
      )}
    </div>
  );
}
