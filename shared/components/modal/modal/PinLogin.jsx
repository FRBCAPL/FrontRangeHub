import React, { useState } from "react";
import styles from "./PinLogin.module.css";
import ResponsiveWrapper from "@shared/components/ResponsiveWrapper";
import PoolSimulation from "@shared/components/PoolSimulation";
import TenBallTutorial from "../../../../FrontEnd/src/components/TenBallTutorial";
import PlayerRegistrationModal from "./PlayerRegistrationModal";
import { BACKEND_URL } from '@shared/config/config.js';

/**
 * Login - Login form for email OR PIN authentication
 * @param {function} onSuccess - callback when login succeeds
 */
export default function Login({ onSuccess }) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);

  // --- Verify Email or PIN against MongoDB ---
  const verifyInput = async () => {
    if (!input) {
      setMessage("Please enter your email or PIN.");
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: input.trim() // Can be email or PIN
        })
      });

      const data = await response.json();
      setLoading(false);

      if (data.success) {
        setMessage("");
        // Pass name, email, PIN, userType, and JWT token to parent
        onSuccess(`${data.user.firstName} ${data.user.lastName}`.trim(), data.user.email, data.user.pin, data.userType, data.token);
      } else {
        setMessage(data.message || "No user found with that email or PIN. Please try again or contact frbcapl@gmail.com for help.");
      }
    } catch (error) {
      setLoading(false);
      setMessage("Error verifying login. Please try again later.");
      console.error("Login verification error:", error);
    }
  };

  // --- Allow Enter key to submit ---
  const handleKeyDown = (e) => {
    if (e.key === "Enter") verifyInput();
  };

  // If game is shown, render the game component directly without any container
  if (showGame) {
    return (
      <div style={{ 
        position: "relative", 
        minHeight: "100vh", 
        width: "100%", 
        overflowX: "hidden", 
        background: "#000" 
      }}>
        <button
          onClick={() => setShowGame(false)}
          style={{ 
            position: "fixed",
            top: "0px",
            left: "0px",
            zIndex: 1000,
            backgroundColor: "#e53e3e",
            color: "white",
            border: "none",
            padding: "12px 20px",
            borderRadius: "0 0 8px 0",
            fontSize: "14px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          ← Back to Login
        </button>
        <TenBallTutorial fromLogin={true} onBackToLogin={() => setShowGame(false)} />
      </div>
    );
  }

  return (
    <div className={styles.pinLoginBg}>
      <div className={styles.pinLoginFrame}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: "1.5rem", justifyContent: 'center' }}>
          <a
            href="https://frusapl.com/frbcapl-singles#3a534cc1-c4ac-4c04-8d7a-a0fe9ddfaca4"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.signupBtn}
          >
            Sign Up for Beta Test
          </a>
          <button
            onClick={() => setShowRegistration(true)}
            className={styles.signupBtn}
            style={{ 
              background: '#4CAF50',
              border: 'none',
              cursor: 'pointer',
              padding: '12px 20px',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Register New Player
          </button>
        </div>
        

        <div className={styles.simulationContainer}>
          <ResponsiveWrapper aspectWidth={600} aspectHeight={300}>
            <PoolSimulation />
          </ResponsiveWrapper>
        </div>
        <div className={styles.pinLoginCard}>
          <h3 className={styles.pinLoginSubtitle}>
            <span className={styles.pinLoginLock} aria-hidden="true">🔒</span>
            <span className={styles.pinOutlineText}> Enter Email or PIN</span>
          </h3>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={showPassword ? "text" : "password"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Email or PIN"
              autoFocus
              className={styles.pinInput}
              aria-label="Email or PIN"
              disabled={loading}
              style={{ paddingRight: '50px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '16px',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <button
            onClick={verifyInput}
            disabled={loading}
            className={styles.pinLoginBtn}
            type="button"
          >
            {loading ? "Verifying..." : "Submit"}
          </button>
          {message && (
            <p className={styles.pinLoginError} role="alert">
              {message}
            </p>
          )}
        </div>
      </div>
      
      {/* Player Registration Modal */}
      <PlayerRegistrationModal
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onSuccess={(userData) => {
          console.log('New player registered:', userData);
          setShowRegistration(false);
          // Optionally auto-login the new user
          if (userData && userData.email) {
            onSuccess(`${userData.firstName} ${userData.lastName}`, userData.email, userData.pin);
          }
        }}
        isMobile={window.innerWidth <= 768}
      />
    </div>
  );
}
