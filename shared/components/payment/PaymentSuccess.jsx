import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BACKEND_URL } from '@shared/config/config.js';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const email = searchParams.get('email');
      const type = searchParams.get('type');
      const claimDataParam = searchParams.get('claimData');

      if (!email || !type || !claimDataParam) {
        setError('Missing payment information. Please contact support.');
        setVerifying(false);
        return;
      }

      // Parse claim data
      const claimData = JSON.parse(decodeURIComponent(claimDataParam));
      
      console.log('🔍 Verifying payment for:', email);
      console.log('📋 Claim data:', claimData);

      // Check payment status with backend
      const statusResponse = await fetch(`${BACKEND_URL}/api/monetization/check-payment-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          claimData: claimData
        })
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('✅ Payment verification result:', statusData);
        
        if (statusData.success && statusData.paymentStatus === 'completed') {
          setVerificationResult({
            success: true,
            message: `🎉 Payment successful! Your claim for Position #${claimData.position} in the ${claimData.ladder} ladder has been approved.`,
            claimData: statusData.claimData
          });
        } else {
          setError('Payment verification failed. Please contact support.');
        }
      } else {
        setError('Failed to verify payment. Please contact support.');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError('An error occurred while verifying payment. Please contact support.');
    } finally {
      setVerifying(false);
    }
  };

  const handleReturnToLadder = () => {
    // Navigate back to the ladder with a success flag
    navigate('/guest/ladder?paymentSuccess=true');
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:frbcapl@gmail.com?subject=Payment Verification Issue';
  };

  if (verifying) {
    return (
      <div className="payment-success-container">
        <div className="verification-section">
          <div className="loading-spinner">⏳</div>
          <h2>Verifying Payment...</h2>
          <p>Please wait while we verify your payment with Square.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-success-container">
        <div className="error-section">
          <div className="error-icon">❌</div>
          <h2>Payment Verification Failed</h2>
          <p className="error-message">{error}</p>
          <div className="action-buttons">
            <button onClick={handleReturnToLadder} className="return-btn">
              ← Return to Ladder
            </button>
            <button onClick={handleContactSupport} className="contact-btn">
              📧 Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (verificationResult?.success) {
    return (
      <div className="payment-success-container">
        <div className="success-section">
          <div className="success-icon">🎉</div>
          <h2>Payment Successful!</h2>
          <div className="success-message">
            <p>{verificationResult.message}</p>
            <div className="claim-details">
              <h3>Claim Details:</h3>
              <ul>
                <li><strong>Position:</strong> #{verificationResult.claimData.position}</li>
                <li><strong>Ladder:</strong> {verificationResult.claimData.ladder}</li>
                <li><strong>Email:</strong> {verificationResult.claimData.email}</li>
                <li><strong>Player:</strong> {verificationResult.claimData.playerName}</li>
              </ul>
            </div>
            <div className="next-steps">
              <h3>Next Steps:</h3>
              <ol>
                <li>Your claim has been approved and recorded</li>
                <li>You now have access to all ladder features</li>
                <li>You can start challenging other players</li>
                <li>Your membership will be automatically renewed monthly</li>
              </ol>
            </div>
          </div>
          <div className="action-buttons">
            <button onClick={handleReturnToLadder} className="return-btn">
              🎯 Return to Ladder
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success-container">
      <div className="unknown-section">
        <div className="unknown-icon">❓</div>
        <h2>Payment Status Unknown</h2>
        <p>We couldn't determine the status of your payment. Please contact support.</p>
        <div className="action-buttons">
          <button onClick={handleReturnToLadder} className="return-btn">
            ← Return to Ladder
          </button>
          <button onClick={handleContactSupport} className="contact-btn">
            📧 Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
