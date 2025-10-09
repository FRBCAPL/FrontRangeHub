import React, { useState } from "react";
import PoolSimulation from "../PoolSimulation";
import TenBallTutorial from "../TenBallTutorial";
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
  const [showGame, setShowGame] = useState(false);
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

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.82), rgba(43, 43, 43, 0.69))',
        border: '2px solid #e53e3e',
        borderRadius: '15px',
        padding: '20px',
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 100px rgba(229, 62, 62, 0.3)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
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

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'end', width: '100%' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="email" style={{
                display: 'block',
                marginBottom: '5px',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '1rem'
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
                  padding: '10px',
                  border: '2px solid #444',
                  borderRadius: '6px',
                  background: '#333',
                  color: '#ffffff',
                  fontSize: '1rem',
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
                marginBottom: '5px',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '1rem'
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
                    padding: '10px 35px 10px 10px',
                    border: '2px solid #444',
                    borderRadius: '6px',
                    background: '#333',
                    color: '#ffffff',
                    fontSize: '1rem',
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
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 25px',
                  background: loading ? '#666' : '#e53e3e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>

          </form>

          {/* Links */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.8rem' }}>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                cursor: 'pointer',
                textDecoration: 'underline'
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
                textDecoration: 'underline'
              }}
            >
              Contact Admin
            </button>
          </div>

          {/* Game Section */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setShowGame(!showGame)}
              style={{
                background: 'transparent',
                color: '#4CAF50',
                border: '2px solid #4CAF50',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {showGame ? "Hide Game" : "Play Game While Loading"}
            </button>
            {showGame && (
              <div style={{ marginTop: '20px' }}>
                <PoolSimulation />
                <TenBallTutorial />
              </div>
            )}
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
