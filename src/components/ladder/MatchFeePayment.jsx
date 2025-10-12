import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../../config.js';
import DraggableModal from '../modal/DraggableModal';

const MatchFeePayment = ({ 
  matchId, 
  playerId, 
  playerName, 
  matchDetails, 
  onClose, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [membership, setMembership] = useState(null);
  const [matchFee, setMatchFee] = useState(5); // Default basic match fee

  useEffect(() => {
    fetchMembershipStatus();
  }, [playerId]);

  const fetchMembershipStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/membership/${playerId}`);
      if (response.ok) {
        const data = await response.json();
        setMembership(data.membership);
        // Fixed match fee of $5 total
        setMatchFee(5);
      }
    } catch (error) {
      console.error('Error fetching membership:', error);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (paymentMethod === 'stripe') {
        await processStripePayment();
      } else if (paymentMethod === 'manual') {
        await processManualPayment();
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processStripePayment = async () => {
    // Create Stripe checkout session for match fee
    const response = await fetch(`${BACKEND_URL}/api/monetization/create-match-fee-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matchId,
        playerId,
        amount: matchFee,
        returnUrl: window.location.origin + '/ladder/match-success'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create payment session');
    }

    // Redirect to Stripe checkout
    window.location.href = data.url;
  };

  const processManualPayment = async () => {
    // Record manual payment
    const response = await fetch(`${BACKEND_URL}/api/monetization/match-fee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matchId,
        playerId,
        amount: matchFee,
        paymentMethod: 'manual',
        status: 'pending'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to record payment');
    }

    setMessage('Match fee recorded! Please complete payment using the instructions below.');
    
    setTimeout(() => {
      onSuccess && onSuccess(data);
      onClose();
    }, 3000);
  };

  return (
    <DraggableModal
      open={true}
      onClose={onClose}
      title="💰 Match Fee Payment"
      maxWidth="500px"
    >
      <div style={{ padding: '1rem' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <h3 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>
            Match Details
          </h3>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
            <p><strong>Player:</strong> {playerName}</p>
            <p><strong>Match Type:</strong> {matchDetails?.type || 'Challenge'}</p>
            <p><strong>Entry Fee:</strong> ${matchDetails?.entryFee || 'TBD'}</p>
            <p><strong>Race Length:</strong> {matchDetails?.raceLength || 'TBD'}</p>
          </div>
        </div>

        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 'bold' }}>Match Fee:</span>
            <span style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '1.2rem' }}>
              ${matchFee}
            </span>
          </div>
                     {membership && (
             <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem' }}>
               Standard membership rate
             </div>
           )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            color: '#fff',
            marginBottom: '0.5rem',
            fontWeight: 'bold'
          }}>
            Payment Method
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.8rem',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              background: paymentMethod === 'stripe' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              flex: 1
            }}>
              <input
                type="radio"
                name="paymentMethod"
                value="stripe"
                checked={paymentMethod === 'stripe'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              💳 Credit Card
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.8rem',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              background: paymentMethod === 'manual' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              flex: 1
            }}>
              <input
                type="radio"
                name="paymentMethod"
                value="manual"
                checked={paymentMethod === 'manual'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              💰 Manual
            </label>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.2)',
            border: '1px solid rgba(244, 67, 54, 0.5)',
            color: '#ff6b6b',
            padding: '0.8rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(76, 175, 80, 0.2)',
            border: '1px solid rgba(76, 175, 80, 0.5)',
            color: '#4CAF50',
            padding: '0.8rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {message}
          </div>
        )}

        <div style={{
          background: 'rgba(33, 150, 243, 0.1)',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h4 style={{ color: '#2196F3', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
            💡 Fee Breakdown
          </h4>
          <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Prize Pool Contribution:</span>
              <span>$3.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Platform Fee:</span>
              <span>$2.00</span>
            </div>
            <div style={{ fontStyle: 'italic', color: '#aaa', fontSize: '0.75rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              Prize pools are also funded by tournament entries ($20 entry: $10 to ladder prize pool, $10 to tournament payout).
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '1rem'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.8rem 1.2rem',
              background: 'transparent',
              color: '#ccc',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePaymentSubmit}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.8rem 1.2rem',
              background: 'linear-gradient(45deg, #4CAF50, #45a049)',
              color: 'white',
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? 'Processing...' : `Pay $${matchFee}`}
          </button>
        </div>
      </div>
    </DraggableModal>
  );
};

export default MatchFeePayment;
