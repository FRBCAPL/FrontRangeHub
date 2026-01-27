import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { createPortal } from 'react-dom';

const BCASanctioningPaymentModal = ({ 
  isOpen, 
  onClose, 
  playerName, 
  playerEmail,
  onSuccess 
}) => {
  console.log('🏆 BCASanctioningPaymentModal rendered with props:', { isOpen, playerName, playerEmail });
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [bcaStatus, setBcaStatus] = useState(null);

  useEffect(() => {
    if (isOpen && playerEmail) {
      fetchBCAStatus();
    }
  }, [isOpen, playerEmail]);

  const fetchBCAStatus = async () => {
    try {
      console.log('🏆 Fetching BCA status for:', playerEmail);
      const response = await fetch(`${BACKEND_URL}/api/monetization/bca-sanctioning-status/${encodeURIComponent(playerEmail)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('🏆 BCA status response:', data);
        setBcaStatus(data);
      } else {
        console.log('🏆 BCA status fetch failed:', response.status);
      }
    } catch (error) {
      console.error('Error fetching BCA status:', error);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (paymentMethod === 'stripe') {
        await processStripePayment();
      } else if (paymentMethod === 'cash') {
        await processCashPayment();
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processStripePayment = async () => {
    // Create Stripe checkout session for BCA sanctioning
    const response = await fetch(`${BACKEND_URL}/api/monetization/create-bca-sanctioning-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerEmail,
        playerName,
        amount: 25.00,
        returnUrl: window.location.origin + '/ladder'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create payment session');
    }

    // Redirect to Stripe checkout
    window.location.href = data.url;
  };

  const processCashPayment = async () => {
    // Record cash payment
    const response = await fetch(`${BACKEND_URL}/api/monetization/bca-sanctioning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerEmail,
        playerName,
        paymentMethod: 'cash',
        amount: 25.00
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to record payment');
    }

    setMessage('✅ Cash payment recorded! Please drop your $25 payment in the red dropbox at Legends. Your BCA sanctioning will be activated once admin receives and approves your payment.');
    
    setTimeout(() => {
      onSuccess && onSuccess(data);
      onClose();
    }, 3000);
  };

  // Show sanction details if player is already sanctioned for current year
  const isAlreadySanctioned = bcaStatus?.player?.sanctioned && bcaStatus?.player?.sanctionYear === new Date().getFullYear();

  return createPortal(
    <DraggableModal
      open={isOpen}
      onClose={onClose}
      title={isAlreadySanctioned ? "✅ BCAPL Sanctioning Status" : "🏆 Get BCAPL Sanctioned"}
      maxWidth="500px"
      borderColor={isAlreadySanctioned ? "#4CAF50" : "#ffc107"}
      textColor="#ffffff"
      glowColor={isAlreadySanctioned ? "#4CAF50" : "#ffc107"}
      zIndex={100000}
      style={{
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98))',
        color: '#ffffff'
      }}
    >
      <div style={{ padding: '20px' }}>
        {/* Current Status */}
        {bcaStatus && (
          <div style={{
            background: bcaStatus.player?.sanctioned ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)',
            border: bcaStatus.player?.sanctioned ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h3 style={{
              color: bcaStatus.player?.sanctioned ? '#10b981' : '#dc2626',
              margin: '0 0 10px 0',
              fontSize: '1.2rem'
            }}>
              {bcaStatus.player?.sanctioned ? '✅ Already Sanctioned' : '❌ Not Sanctioned'}
            </h3>
            <p style={{ color: '#e0e0e0', margin: 0, fontSize: '1rem' }}>
              {bcaStatus.player?.sanctioned 
                ? `Sanctioned for ${bcaStatus.player.sanctionYear}` 
                : 'Get BCA-sanctioned to have your matches reported to FargoRate'
              }
            </p>
          </div>
        )}

        {/* Sanctioned Player Details */}
        {bcaStatus?.player?.sanctioned && (
          <div>
            <div style={{
              background: 'rgba(0, 188, 212, 0.1)',
              border: '1px solid rgba(0, 188, 212, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '15px'
            }}>
              <h4 style={{ color: '#00BCD4', marginBottom: '8px', fontSize: '1rem' }}>What This Means:</h4>
              <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.9rem' }}>
                <li>Your ladder matches played against other sanctioned players are reported to FargoRate</li>
                <li>Your official FargoRate will be updated</li>
                <li>You're eligible for all BCAPL benefits</li>
              </ul>
            </div>

            {bcaStatus?.payment && (
              <div style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '15px'
              }}>
                <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1rem' }}>Payment Details:</h4>
                <p style={{ color: '#e0e0e0', margin: 0, fontSize: '0.9rem' }}>
                  <strong>Amount:</strong> ${bcaStatus.payment.amount}<br/>
                  <strong>Status:</strong> {bcaStatus.payment.status}<br/>
                  <strong>Date:</strong> {new Date(bcaStatus.payment.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Payment Form */}
        {!bcaStatus?.player?.sanctioned && (
          <form onSubmit={handlePaymentSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#ffc107', marginBottom: '12px', fontSize: '1.1rem' }}>Payment Information</h4>
              <div style={{
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '15px'
              }}>
                <p style={{ color: '#e0e0e0', margin: '0 0 8px 0', fontSize: '0.95rem' }}>
                  <strong>BCA Sanctioning Fee:</strong> $25.00
                </p>
                <p style={{ color: '#e0e0e0', margin: '0 0 8px 0', fontSize: '0.95rem' }}>
                  <strong>Valid For:</strong> Current calendar year ({new Date().getFullYear()})
                </p>
                <p style={{ color: '#e0e0e0', margin: 0, fontSize: '0.95rem' }}>
                  <strong>Benefit:</strong> Your ladder matches will be reported to FargoRate
                </p>
              </div>
            </div>

            {/* Previously Sanctioned Notice */}
            <div style={{
              background: 'rgba(255, 87, 34, 0.1)',
              border: '1px solid rgba(255, 87, 34, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <h4 style={{ color: '#ff5722', marginBottom: '8px', fontSize: '1rem' }}>⚠️ Already Sanctioned?</h4>
              <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.9rem' }}>
                <li><strong>Showing as Not Sanctioned?</strong></li>
                <li>If you have already paid for BCA sanctioning in another league, please contact an admin</li>
                <li><strong>Verification:</strong> Admins can verify your payment and update your sanctioning status manually</li>
              </ul>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#ccc', marginBottom: '8px', fontWeight: 'bold' }}>
                Payment Method
              </label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: paymentMethod === 'stripe' ? '2px solid #8b5cf6' : '2px solid rgba(255, 255, 255, 0.2)',
                  background: paymentMethod === 'stripe' ? 'rgba(139, 92, 246, 0.1)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="stripe"
                    checked={paymentMethod === 'stripe'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  💳 Credit Card (Instant)
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: paymentMethod === 'cash' ? '2px solid #8b5cf6' : '2px solid rgba(255, 255, 255, 0.2)',
                  background: paymentMethod === 'cash' ? 'rgba(139, 92, 246, 0.1)' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ marginRight: '8px' }}
                  />
                  💵 Cash (Dropbox)
                </label>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '15px',
                color: '#fca5a5',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '15px',
                color: '#6ee7b7',
                fontSize: '0.9rem'
              }}>
                {message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: '#ccc',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Processing...' : `Pay $25.00`}
              </button>
            </div>
          </form>
        )}

        {/* Cash Payment Instructions */}
        {paymentMethod === 'cash' && (
          <div style={{
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '15px'
          }}>
            <h5 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1rem' }}>Cash Payment Instructions</h5>
            <ul style={{ color: '#e0e0e0', paddingLeft: '15px', margin: 0, fontSize: '0.9rem' }}>
              <li>Drop $25.00 in the red dropbox at Legends</li>
              <li>Include a note with your name and "BCA Sanctioning"</li>
              <li>Your sanctioning will be activated once admin receives payment</li>
              <li>You'll receive confirmation when processed</li>
            </ul>
          </div>
        )}
      </div>
    </DraggableModal>,
    document.body
  );
};

export default BCASanctioningPaymentModal;
