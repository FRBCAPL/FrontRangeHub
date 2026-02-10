/**
 * Claim Position Modal - Slim flow for claiming an existing ladder position.
 * Enter name → Find position → Continue with Google
 */

import React, { useState } from 'react';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';
import supabaseAuthService from '@shared/services/services/supabaseAuthService.js';

export default function ClaimPositionModal({ isOpen, onClose, claimingPlayer = null }) {
  const [step, setStep] = useState(claimingPlayer ? 'claim' : 'name');
  const [firstName, setFirstName] = useState(claimingPlayer?.firstName || '');
  const [lastName, setLastName] = useState(claimingPlayer?.lastName || '');
  const [foundPlayer, setFoundPlayer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFind = async (e) => {
    e?.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both first and last name.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await supabaseDataService.checkExistingPlayer(
        firstName.trim(),
        lastName.trim(),
        null
      );
      if (result.success && result.hasExistingPlayers && result.foundPlayers?.length > 0) {
        const p = result.foundPlayers.find(x => x.ladder_profiles?.length) || result.foundPlayers[0];
        const lp = p.ladder_profiles?.[0];
        setFoundPlayer({
          first_name: p.first_name,
          last_name: p.last_name,
          position: lp?.position ?? 999,
          ladder_name: lp?.ladder_name || '499-under',
          fargo_rate: lp?.fargo_rate
        });
        setStep('claim');
      } else {
        setError("We couldn't find you on the ladder. Try \"I'm a New Player\" instead.");
      }
    } catch (err) {
      setError('Error checking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimWithGoogle = async () => {
    setError('');
    setLoading(true);
    localStorage.removeItem('__DUES_TRACKER_OAUTH__');
    const returnTo = typeof window !== 'undefined' ? (window.location.pathname || '/ladder') : '/ladder';
    localStorage.setItem('oauthReturnTo', returnTo.startsWith('/ladder') || returnTo.startsWith('/guest/ladder') ? returnTo : '/ladder');
    localStorage.setItem('pendingClaim', JSON.stringify({
      firstName: foundPlayer?.first_name || firstName,
      lastName: foundPlayer?.last_name || lastName,
      phone: '',
      message: '',
      position: foundPlayer?.position ?? 999,
      ladderName: foundPlayer?.ladder_name || '499-under',
      fargoRate: foundPlayer?.fargo_rate,
      isClaiming: true
    }));
    try {
      const result = await supabaseAuthService.signInWithOAuth('google');
      if (!result.success) {
        setError(result.message || 'Failed to sign in.');
        setLoading(false);
        localStorage.removeItem('pendingClaim');
      }
    } catch (err) {
      setError('Failed. Please try again.');
      setLoading(false);
      localStorage.removeItem('pendingClaim');
    }
  };

  const reset = () => {
    setStep(claimingPlayer ? 'claim' : 'name');
    setFirstName(claimingPlayer?.firstName || '');
    setLastName(claimingPlayer?.lastName || '');
    setFoundPlayer(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const inputStyle = {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    border: '2px solid #444',
    background: '#2a2a2a',
    color: '#fff',
    fontSize: '1rem'
  };

  return (
    <DraggableModal
      open={isOpen}
      onClose={handleClose}
      title="Claim Your Ladder Position"
      maxWidth="480px"
    >
      <div style={{ padding: 24 }}>
        {step === 'name' && (
          <form onSubmit={handleFind}>
            <p style={{ color: '#aaa', marginBottom: 20, fontSize: '0.95rem' }}>
              Enter your name as it appears on the ladder.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#fff', fontWeight: 600 }}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                style={inputStyle}
                placeholder="First name"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#fff', fontWeight: 600 }}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                style={inputStyle}
                placeholder="Last name"
              />
            </div>
            {error && (
              <div style={{
                background: 'rgba(220,53,69,0.15)',
                border: '1px solid rgba(220,53,69,0.4)',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                color: '#ff6b6b'
              }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  flex: 1,
                  padding: 14,
                  background: 'transparent',
                  color: '#fff',
                  border: '2px solid #666',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !firstName.trim() || !lastName.trim()}
                style={{
                  flex: 2,
                  padding: 14,
                  background: loading ? '#555' : '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {loading ? 'Checking...' : 'Find My Position'}
              </button>
            </div>
          </form>
        )}

        {step === 'claim' && (foundPlayer || claimingPlayer) && (
          <div>
            <div style={{
              background: 'rgba(76,175,80,0.15)',
              border: '2px solid #4CAF50',
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4CAF50' }}>
                {foundPlayer ? `${foundPlayer.first_name} ${foundPlayer.last_name}` : `${claimingPlayer?.firstName} ${claimingPlayer?.lastName}`}
              </div>
              <div style={{ color: '#aaa', fontSize: '0.9rem', marginTop: 4 }}>
                Position #{foundPlayer?.position ?? claimingPlayer?.position} • {foundPlayer?.ladder_name || claimingPlayer?.ladderName || '499-under'}
              </div>
            </div>
            <p style={{ color: '#aaa', marginBottom: 20 }}>
              Sign in with Google to claim this position.
            </p>
            {error && (
              <div style={{
                background: 'rgba(220,53,69,0.15)',
                border: '1px solid rgba(220,53,69,0.4)',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                color: '#ff6b6b'
              }}>
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleClaimWithGoogle}
              disabled={loading}
              style={{
                width: '100%',
                padding: 14,
                background: '#fff',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12
              }}
            >
              <img src="https://img.icons8.com/color/24/000000/google-logo.png" alt="" style={{ height: 24 }} />
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('name'); setFoundPlayer(null); setError(''); }}
              style={{
                width: '100%',
                marginTop: 12,
                padding: 10,
                background: 'transparent',
                color: '#888',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              ← Different name
            </button>
          </div>
        )}
      </div>
    </DraggableModal>
  );
}
