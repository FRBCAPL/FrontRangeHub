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
        minHeight: '100vh',
        width: '100vw',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000,
        padding: 0
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
          border: '2px solid #e53e3e',
          borderRadius: '15px',
          padding: '40px',
          width: '90%',
          maxWidth: '400px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          color: '#ffffff'
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

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label htmlFor="email" style={{
                display: 'block',
                marginBottom: '8px',
                color: '#ffffff',
                fontWeight: 'bold'
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
                  padding: '12px',
                  border: '2px solid #444',
                  borderRadius: '8px',
                  background: '#333',
                  color: '#ffffff',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" style={{
                display: 'block',
                marginBottom: '8px',
                color: '#ffffff',
                fontWeight: 'bold'
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
                    padding: '12px 40px 12px 12px',
                    border: '2px solid #444',
                    borderRadius: '8px',
                    background: '#333',
                    color: '#ffffff',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {message && (
              <div style={{
                padding: '10px',
                background: message.includes('error') ? 'rgba(229, 62, 62, 0.2)' : 'rgba(76, 175, 80, 0.2)',
                border: `1px solid ${message.includes('error') ? '#e53e3e' : '#4CAF50'}`,
                borderRadius: '8px',
                color: message.includes('error') ? '#e53e3e' : '#4CAF50',
                fontSize: '0.9rem'
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                background: loading ? '#666' : 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(229, 62, 62, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textDecoration: 'underline'
              }}
            >
              Forgot Password?
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{
              margin: '5px 0',
              color: '#cccccc',
              fontSize: '0.9rem'
            }}>
              Don't have an account?{" "}
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
            </p>
            <p style={{
              margin: '5px 0',
              color: '#cccccc',
              fontSize: '0.9rem'
            }}>
              Forgot your password?{" "}
              <button
                type="button"
                onClick={() => setMessage("Please contact frbcapl@gmail.com for password reset.")}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e53e3e',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Contact Support
              </button>
            </p>
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
