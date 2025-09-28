import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../../config.js';

const BCASanctioningSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setError('No session ID found');
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      // In a real implementation, you would verify the payment with Stripe
      // For now, we'll simulate a successful payment
      setPaymentData({
        amount: 25.00,
        status: 'completed',
        playerName: 'Player Name', // This would come from the session
        sanctionYear: new Date().getFullYear()
      });
      setLoading(false);
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError('Failed to verify payment');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏆</div>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>Verifying Payment...</div>
          <div style={{ fontSize: '16px', color: '#ccc' }}>Please wait while we process your BCA sanctioning payment</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <div style={{ fontSize: '24px', marginBottom: '10px', color: '#f44336' }}>Payment Error</div>
          <div style={{ fontSize: '16px', color: '#ccc', marginBottom: '30px' }}>{error}</div>
          <button
            onClick={() => navigate('/ladder')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
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
      background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '600px',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏆</div>
        
        <h1 style={{
          fontSize: '32px',
          marginBottom: '20px',
          color: '#10b981',
          textShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
        }}>
          BCA Sanctioning Successful!
        </h1>
        
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#10b981', marginBottom: '15px', fontSize: '20px' }}>Payment Details</h3>
          <div style={{ fontSize: '16px', lineHeight: '1.6' }}>
            <p style={{ margin: '8px 0' }}><strong>Amount:</strong> ${paymentData?.amount?.toFixed(2)}</p>
            <p style={{ margin: '8px 0' }}><strong>Status:</strong> ✅ Completed</p>
            <p style={{ margin: '8px 0' }}><strong>Valid For:</strong> {paymentData?.sanctionYear}</p>
            <p style={{ margin: '8px 0' }}><strong>Session ID:</strong> {sessionId}</p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#ffc107', marginBottom: '15px', fontSize: '18px' }}>What's Next?</h3>
          <ul style={{ textAlign: 'left', fontSize: '14px', lineHeight: '1.6', paddingLeft: '20px' }}>
            <li>Your BCA sanctioning is now active for {new Date().getFullYear()}</li>
            <li>All your ladder matches will be reported to FargoRate</li>
            <li>Your sanctioning status will show as ✓ in the ladder</li>
            <li>You can now participate in BCA-sanctioned tournaments</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/ladder')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Return to Ladder
          </button>
          
          <button
            onClick={() => window.print()}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: '#8b5cf6',
              border: '2px solid #8b5cf6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Print Receipt
          </button>
        </div>

        <div style={{
          marginTop: '30px',
          padding: '15px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#ccc'
        }}>
          <p style={{ margin: 0 }}>
            <strong>Note:</strong> This payment is for BCA sanctioning only. 
            You still need to maintain your $5/month ladder membership to participate in challenges and report matches.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BCASanctioningSuccess;
