import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '@shared/config/config.js';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [membership, setMembership] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const email = searchParams.get('email');
    const canceled = searchParams.get('canceled');

    if (canceled === 'true') {
      setError('Payment was canceled. You can try again or contact support.');
      setLoading(false);
      return;
    }

    if (sessionId && email) {
      verifyPayment(sessionId, email);
    } else {
      setError('Invalid payment session');
      setLoading(false);
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId, email) => {
    try {
      // Verify the payment session with Stripe
      const response = await fetch(`${BACKEND_URL}/api/monetization/verify-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          email
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMembership(data.membership);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError('Failed to verify payment. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigate('/ladder');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: '#fff',
        padding: '2rem'
      }}>
        <div className="loading-spinner" style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTop: '4px solid #fff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '2rem'
        }}></div>
        <h2>Verifying Payment...</h2>
        <p>Please wait while we confirm your payment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: '#fff',
        padding: '2rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2>Payment Error</h2>
          <p style={{ color: '#ffcccb', marginBottom: '2rem' }}>{error}</p>
          <button
            onClick={() => navigate('/ladder')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Return to Ladder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      color: '#fff',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h2>Payment Successful!</h2>
        
        {membership && (
          <div style={{ marginBottom: '2rem' }}>
            <p>Welcome to the Front Range Pool Hub Ladder!</p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1rem'
            }}>
              <h3>Membership Details</h3>
              <p><strong>Plan:</strong> {membership.tier} Membership</p>
              <p><strong>Amount:</strong> ${membership.amount}/month</p>
              <p><strong>Status:</strong> {membership.status}</p>
            </div>
          </div>
        )}
        
        <p style={{ marginBottom: '2rem' }}>
          Your membership is now active. You can start playing ladder matches and tracking your progress!
        </p>
        
        <button
          onClick={handleContinue}
          style={{
            background: 'rgba(76, 175, 80, 0.8)',
            border: 'none',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(76, 175, 80, 1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(76, 175, 80, 0.8)';
          }}
        >
          Continue to Ladder
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
