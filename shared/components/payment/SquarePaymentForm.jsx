import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';

const SquarePaymentForm = ({ 
  amount = 5.00, 
  playerName, 
  playerEmail, 
  onSuccess, 
  onError, 
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardToken, setCardToken] = useState(null);
  const [applePayToken, setApplePayToken] = useState(null);
  const [googlePayToken, setGooglePayToken] = useState(null);

  useEffect(() => {
    // Load Square Web Payments SDK
    const script = document.createElement('script');
    script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
    script.onload = initializeSquare;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initializeSquare = async () => {
    try {
      // Initialize Square Web Payments
      if (window.Square) {
        const payments = window.Square.payments(process.env.REACT_APP_SQUARE_APPLICATION_ID, process.env.REACT_APP_SQUARE_LOCATION_ID);
        
        // Initialize card payment
        const card = await payments.card();
        await card.attach('#card-container');
        
        card.addEventListener('tokenization', (event) => {
          setCardToken(event.detail.token);
        });

        // Initialize Apple Pay if available
        if (window.ApplePaySession && window.ApplePaySession.canMakePayments()) {
          const applePay = await payments.applePay({
            countryCode: 'US',
            currencyCode: 'USD',
            merchantCapabilities: ['supports3DS'],
            supportedNetworks: ['visa', 'masterCard', 'amex', 'discover']
          });

          applePay.addEventListener('tokenization', (event) => {
            setApplePayToken(event.detail.token);
          });
        }

        // Initialize Google Pay if available
        if (window.google && window.google.payments) {
          const googlePay = await payments.googlePay({
            countryCode: 'US',
            currencyCode: 'USD',
            environment: 'TEST'
          });

          googlePay.addEventListener('tokenization', (event) => {
            setGooglePayToken(event.detail.token);
          });
        }
      }
    } catch (error) {
      console.error('Square initialization error:', error);
    }
  };

  const handlePayment = async () => {
    setLoading(true);

    try {
      let sourceId = null;

      // Get the appropriate token based on payment method
      switch (paymentMethod) {
        case 'card':
          sourceId = cardToken;
          break;
        case 'apple_pay':
          sourceId = applePayToken;
          break;
        case 'google_pay':
          sourceId = googlePayToken;
          break;
        default:
          throw new Error('Invalid payment method');
      }

      if (!sourceId) {
        throw new Error('Payment token not available. Please try again.');
      }

      // Process payment through backend
      const response = await fetch(`${BACKEND_URL}/api/monetization/square/create-membership-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: playerEmail,
          playerName: playerName,
          sourceId: sourceId,
          amount: Math.round(amount * 100) // Convert to cents
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment failed');
      }

      onSuccess(data);

    } catch (error) {
      console.error('Payment error:', error);
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentLink = async () => {
    setLoading(true);

    try {
      // Create payment link
      const response = await fetch(`${BACKEND_URL}/api/monetization/square/create-membership-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: playerEmail,
          playerName: playerName,
          amount: Math.round(amount * 100), // Convert to cents
          redirectUrl: `${window.location.origin}/payment-success`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment link');
      }

      // Redirect to Square payment page
      window.location.href = data.url;

    } catch (error) {
      console.error('Payment link error:', error);
      onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '1.5rem',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <h3 style={{ 
        color: '#4caf50', 
        marginBottom: '1rem', 
        textAlign: 'center',
        fontSize: '1.2rem'
      }}>
        💳 Secure Payment - ${amount}
      </h3>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          color: '#fff',
          marginBottom: '0.5rem',
          fontWeight: 'bold'
        }}>
          Payment Method:
        </label>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', cursor: 'pointer' }}>
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ cursor: 'pointer' }}
            />
            💳 Credit/Debit Card
          </label>
          
          {window.ApplePaySession && window.ApplePaySession.canMakePayments() && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentMethod"
                value="apple_pay"
                checked={paymentMethod === 'apple_pay'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ cursor: 'pointer' }}
              />
              🍎 Apple Pay
            </label>
          )}
          
          {window.google && window.google.payments && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentMethod"
                value="google_pay"
                checked={paymentMethod === 'google_pay'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ cursor: 'pointer' }}
              />
              🤖 Google Pay
            </label>
          )}
        </div>

        {paymentMethod === 'card' && (
          <div style={{ marginBottom: '1rem' }}>
            <div id="card-container" style={{
              padding: '1rem',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              minHeight: '60px'
            }}></div>
          </div>
        )}

        {paymentMethod === 'apple_pay' && (
          <div style={{
            padding: '1rem',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            color: '#ccc'
          }}>
            Apple Pay will be activated when you click "Pay Now"
          </div>
        )}

        {paymentMethod === 'google_pay' && (
          <div style={{
            padding: '1rem',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            color: '#ccc'
          }}>
            Google Pay will be activated when you click "Pay Now"
          </div>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '1rem',
        justifyContent: 'center'
      }}>
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: '0.8rem 1.5rem',
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
          onClick={handlePayment}
          disabled={loading || (!cardToken && !applePayToken && !googlePayToken)}
          style={{
            padding: '0.8rem 1.5rem',
            background: 'linear-gradient(45deg, #4CAF50, #45a049)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>

      <div style={{ 
        marginTop: '1rem', 
        textAlign: 'center' 
      }}>
        <button
          onClick={handlePaymentLink}
          disabled={loading}
          style={{
            background: 'transparent',
            color: '#4caf50',
            border: 'none',
            textDecoration: 'underline',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            opacity: loading ? 0.6 : 1
          }}
        >
          Or pay via secure link
        </button>
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '0.8rem',
        background: 'rgba(255, 193, 7, 0.1)',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '6px',
        color: '#ffc107',
        fontSize: '0.85rem',
        textAlign: 'center'
      }}>
        🔒 Your payment information is secure and encrypted
      </div>
    </div>
  );
};

export default SquarePaymentForm;
