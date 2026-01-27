import React, { useState } from "react";
import { BACKEND_URL } from '@shared/config/config.js';
import ResponsiveWrapper from "@shared/components/ResponsiveWrapper";
import PoolSimulation from "@shared/components/PoolSimulation.jsx";
import unifiedAuthService from '@shared/services/services/unifiedAuthService.js';
import './EmbeddedLoginForm.css';

export default function EmbeddedLoginForm({ onSuccess, onShowSignup }) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  // Check if mobile
  const isMobile = window.innerWidth <= 768;

  const verifyInput = async () => {
    if (!input || input.trim() === '') {
      setMessage("Please enter your email or PIN.");
      return;
    }
    
    const trimmedInput = input.trim();
    setMessage("");
    setLoading(true);
    setError(null);
    
    try {
      // Use the new unified authentication service
      const result = await unifiedAuthService.login(trimmedInput);
      setLoading(false);

      if (result.success) {
        setMessage("");
        // Pass complete user data including profile status
        onSuccess(
          `${result.user.firstName} ${result.user.lastName}`.trim(),
          result.user.email,
          result.user.pin,
          result.userType,
          result.user,
          result.profileStatus
        );
      } else {
        // Handle different error cases
        setMessage(result.message || "Login failed. Please try again or contact frbcapl@gmail.com for help.");
      }
    } catch (error) {
      setLoading(false);
      console.error("Login verification error:", error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setMessage("Cannot connect to server. Please check your connection and try again.");
      } else {
        setMessage("An unexpected error occurred. Please try again.");
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") verifyInput();
  };

  // Simple error display
  if (error) {
    return (
      <div style={{ padding: '20px', color: 'white' }}>
        <h3>Error</h3>
        <p>Something went wrong. Please refresh the page and try again.</p>
      </div>
    );
  }

  return (
    <div className="embedded-login-frame" style={{ 
      position: 'relative',
      width: '100%',
      height: isMobile ? '350px' : '450px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      
      {/* Pool Table Background - Better proportions */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        zIndex: 1
      }}>
        {/* Use better aspect ratio for pool table - more realistic proportions */}
        <ResponsiveWrapper aspectWidth={isMobile ? 350 : 800} aspectHeight={isMobile ? 200 : 400}>
          <PoolSimulation />
        </ResponsiveWrapper>
      </div>

      {/* Login Form Overlay - PERFECTLY CENTERED on pool table, SMALLER on mobile */}
      <div style={{
        position: 'absolute',
        top: '50%', // Center vertically
        left: '50%', // Center horizontally
        transform: 'translate(-50%, -50%)', // Perfect centering
        zIndex: 10,
        width: isMobile ? '180px' : '420px', // Wide on PC, small on mobile
        maxWidth: isMobile ? '60%' : '90%', // Very restrictive on mobile
        pointerEvents: 'auto',
        // Prevent movement on mobile tap
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        // Prevent zoom on input focus
        transformOrigin: 'center center',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        // CRITICAL: Prevent any movement while preserving centering
        willChange: 'auto',
        transition: 'none',
        animation: 'none',
        // Force stability with vendor prefixes
        WebkitTransform: 'translate(-50%, -50%)',
        MozTransform: 'translate(-50%, -50%)',
        msTransform: 'translate(-50%, -50%)',
        OTransform: 'translate(-50%, -50%)',
        // Prevent jumping during resize
        contain: 'layout style paint'
      }}>
        <div style={{ 
          padding: isMobile ? '8px' : '24px', // Much smaller padding on mobile
          background: 'rgba(0, 0, 0, 0.85)',
          border: '2px solid #e53e3e',
          borderRadius: '12px',
          width: '100%',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Title First - much smaller on mobile */}
          <h3 style={{ 
            color: 'white', 
            textAlign: 'center', 
            marginBottom: isMobile ? '4px' : '20px',
            fontSize: isMobile ? '0.7rem' : '1.4rem', // Much smaller font on mobile
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            🔒 Front Range Pool League
          </h3>
          
          {/* Login Section Second */}
          <div style={{ marginBottom: isMobile ? '4px' : '20px', position: 'relative' }}>
            <input
              type={showPassword ? "text" : "password"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter Email or PIN"
              disabled={loading}
              style={{
                width: '100%',
                padding: isMobile ? '6px 40px 6px 16px' : '16px 40px 16px 16px', // Add right padding for toggle button
                border: '2px solid #e53e3e',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: isMobile ? '16px' : '1rem',
                boxSizing: 'border-box',
                minHeight: isMobile ? '28px' : 'auto', // Much smaller height on mobile
                transition: 'none',
                outline: 'none'
              }}
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
                fontSize: isMobile ? '14px' : '16px',
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
            type="button"
            style={{
              width: '100%',
              background: '#e53e3e',
              color: 'white',
              border: 'none',
              padding: isMobile ? '6px' : '16px', // Much smaller padding on mobile
              fontSize: isMobile ? '0.6rem' : '1.1rem', // Much smaller font on mobile
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: isMobile ? '3px' : '12px',
              minHeight: isMobile ? '28px' : 'auto', // Much smaller height on mobile
              transition: 'none',
              outline: 'none'
            }}
          >
            {loading ? "Verifying..." : "Login to Access Hub"}
          </button>

          {/* First Time User Button - much smaller on mobile */}
          <button
            onClick={onShowSignup}
            type="button"
            style={{
              width: '100%',
              background: 'transparent',
              color: '#FF6B35',
              border: '2px solid #FF6B35',
              padding: isMobile ? '4px' : '14px', // Much smaller padding on mobile
              fontSize: isMobile ? '0.5rem' : '1rem', // Much smaller font on mobile
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: isMobile ? '3px' : '16px',
              transition: 'none',
              minHeight: isMobile ? '24px' : 'auto', // Much smaller height on mobile
              outline: 'none'
            }}
          >
            🎯 Join Front Range Pool Hub
          </button>
          
          {message && (
            <p style={{
              color: '#ff6b6b',
              textAlign: 'center',
              margin: '0 0 4px 0',
              fontSize: isMobile ? '0.4rem' : '0.9rem', // Much smaller font on mobile
              padding: '2px',
              borderRadius: '4px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.3)'
            }}>
              {message}
            </p>
          )}
          
          {/* Apps Selection Third - much smaller on mobile */}
          <p style={{
            color: '#ccc',
            fontSize: isMobile ? '0.3rem' : '0.8rem', // Much smaller font on mobile
            textAlign: 'center',
            margin: '0'
          }}>
            Access league matches, ladder challenges, and more
          </p>
        </div>
      </div>
    </div>
  );
}
