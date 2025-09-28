import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../../config.js';

const PaymentDashboard = ({ isOpen, onClose, playerEmail }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Account data
  const [accountData, setAccountData] = useState({
    credits: 0,
    membership: null,
    paymentHistory: [],
    trustLevel: 'new',
    stats: {}
  });
  
  // Purchase forms
  const [purchaseForm, setPurchaseForm] = useState({
    amount: 20,
    paymentMethod: '',
    customAmount: ''
  });
  
  const [membershipForm, setMembershipForm] = useState({
    paymentMethod: '',
    duration: 'monthly'
  });
  
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  
  // Draggable state
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && playerEmail) {
      loadAccountData();
      loadPaymentMethods();
      // Reset position when modal opens
      setDrag({ x: 0, y: 0 });
    }
  }, [isOpen, playerEmail]);

  // Drag event handlers
  const onMouseDown = (e) => {
    setDragging(true);
    dragStart.current = {
      x: e.clientX - drag.x,
      y: e.clientY - drag.y,
    };
    document.body.style.userSelect = "none";
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    setDrag({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const onMouseUp = () => {
    setDragging(false);
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      console.log(`🔍 Loading account data for: ${playerEmail}`);
      console.log(`📡 URL: ${BACKEND_URL}/api/monetization/user-payment-data/${playerEmail}`);
      
      const response = await fetch(`${BACKEND_URL}/api/monetization/user-payment-data/${playerEmail}`);
      console.log(`📊 Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Account data loaded:', data);
        setAccountData({
          credits: data.credits || 0,
          membership: data.membership || null,
          paymentHistory: data.paymentHistory?.recentPayments || [],
          trustLevel: data.paymentHistory?.trustLevel || 'new',
          stats: data.paymentHistory || {}
        });
        setError(''); // Clear any previous errors
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to load account data:', response.status, errorData);
        
        // Provide fallback data when endpoint is not available
        setAccountData({
          credits: 0,
          membership: null,
          paymentHistory: [],
          trustLevel: 'new',
          stats: { totalPayments: 0, failedPayments: 0, successRate: 0 }
        });
        setError('Payment system temporarily unavailable. Using default settings.');
      }
    } catch (error) {
      console.error('❌ Network error loading account data:', error);
      
      // Provide fallback data on network error
      setAccountData({
        credits: 0,
        membership: null,
        paymentHistory: [],
        trustLevel: 'new',
        stats: { totalPayments: 0, failedPayments: 0, successRate: 0 }
      });
      setError('Network error. Using default settings.');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/payment-methods`);
      if (response.ok) {
        const data = await response.json();
        setAvailablePaymentMethods(data.paymentMethods || []);
        if (data.paymentMethods.length > 0) {
          setPurchaseForm(prev => ({ ...prev, paymentMethod: data.paymentMethods[0].id }));
          setMembershipForm(prev => ({ ...prev, paymentMethod: data.paymentMethods[0].id }));
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const handlePurchaseCredits = async () => {
    try {
      setLoading(true);
      setError('');
      
      const amount = purchaseForm.customAmount ? parseFloat(purchaseForm.customAmount) : purchaseForm.amount;
      
      if (!amount || amount < 5) {
        setError('Minimum purchase amount is $5.00');
        return;
      }
      
      if (!purchaseForm.paymentMethod) {
        setError('Please select a payment method');
        return;
      }
      
      const isCashPayment = purchaseForm.paymentMethod === 'cash';
      
      const response = await fetch(`${BACKEND_URL}/api/monetization/purchase-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerEmail,
          amount,
          paymentMethod: purchaseForm.paymentMethod,
          paymentData: { 
            source: 'payment_dashboard',
            isCashPayment: isCashPayment,
            notes: isCashPayment ? `Cash payment at Legends red dropbox - Credit purchase $${amount}` : undefined
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.payment?.status === 'pending_verification') {
          if (isCashPayment) {
            setMessage('✅ Cash payment recorded! Please drop your payment in the red dropbox at Legends. Credits will NOT be added until admin receives and approves your payment.');
          } else {
            setMessage('✅ Payment recorded! Pending admin verification.');
          }
        } else {
          setMessage(`✅ Successfully purchased $${amount.toFixed(2)} in credits!`);
        }
        await loadAccountData();
        setPurchaseForm({ amount: 20, paymentMethod: purchaseForm.paymentMethod, customAmount: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to purchase credits');
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
      setError('Network error purchasing credits');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseMembership = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!membershipForm.paymentMethod) {
        setError('Please select a payment method');
        return;
      }
      
      const isCashPayment = membershipForm.paymentMethod === 'cash';
      
      const response = await fetch(`${BACKEND_URL}/api/monetization/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerEmail,
          amount: 5.00,
          paymentMethod: membershipForm.paymentMethod,
          description: 'Monthly Ladder Membership',
          type: 'membership',
          requiresVerification: false, // Let backend determine based on payment method and trust level
          notes: isCashPayment ? 
            `Cash payment at Legends red dropbox - Membership purchase ${membershipForm.duration}` : 
            `Membership purchase via dashboard - ${membershipForm.duration}`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.payment?.status === 'pending_verification') {
          if (isCashPayment) {
            setMessage('✅ Cash payment recorded! Please drop your payment in the red dropbox at Legends. Membership will NOT be activated until admin receives and approves your payment.');
          } else {
            setMessage('✅ Payment recorded! Pending admin verification.');
          }
        } else {
          setMessage('✅ Membership activated successfully!');
        }
        await loadAccountData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to purchase membership');
      }
    } catch (error) {
      console.error('Error purchasing membership:', error);
      setError('Network error purchasing membership');
    } finally {
      setLoading(false);
    }
  };

  const getTrustLevelColor = (level) => {
    switch (level) {
      case 'trusted': return '#4caf50';
      case 'verified': return '#ff9800';
      default: return '#f44336';
    }
  };

  const getTrustLevelIcon = (level) => {
    switch (level) {
      case 'trusted': return '🟢';
      case 'verified': return '🟡';
      default: return '🔴';
    }
  };

  const getTrustLevelDisplayText = (level) => {
    switch (level) {
      case 'trusted': return 'Instant Process';
      case 'verified': return 'Auto Process';
      default: return 'Needs Admin Approval';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOverview = () => (
    <div>
      {/* Account Status Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <h3 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>📊 Account Status</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Available Credits</div>
            <div style={{ color: '#4caf50', fontSize: '1.5rem', fontWeight: 'bold' }}>
              ${accountData.credits.toFixed(2)}
            </div>
          </div>
          
          <div>
            <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Payment Status</div>
            <div style={{ 
              color: getTrustLevelColor(accountData.trustLevel), 
              fontSize: '0.8rem', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              {getTrustLevelIcon(accountData.trustLevel)} {getTrustLevelDisplayText(accountData.trustLevel)}
            </div>
          </div>
        </div>
        
        <div style={{ 
          background: accountData.membership?.isActive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
          border: `1px solid ${accountData.membership?.isActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`,
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ 
            color: accountData.membership?.isActive ? '#4caf50' : '#ff9800',
            fontWeight: 'bold',
            marginBottom: '0.5rem'
          }}>
            {accountData.membership?.isActive ? '✅ Active Membership' : '⚠️ Membership Expired'}
          </div>
          {accountData.membership?.isActive ? (
            <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
              Expires: {formatDate(accountData.membership.expiresAt)}
            </div>
          ) : (
            <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
              Renew your membership to report matches
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <h3 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>⚡ Quick Actions</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button
            onClick={() => setActiveTab('credits')}
            style={{
              background: 'linear-gradient(45deg, #4CAF50, #45a049)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '1rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            💳 Buy Credits
          </button>
          
          <button
            onClick={() => setActiveTab('membership')}
            style={{
              background: 'linear-gradient(45deg, #ff9800, #f57c00)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '1rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            🎯 Renew Membership
          </button>
        </div>
      </div>

      {/* Payment Statistics */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '1rem'
      }}>
        <h3 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>📈 Payment Statistics</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', color: '#ccc', fontSize: '0.9rem' }}>
          <div>
            <div style={{ color: '#4caf50', fontSize: '1.2rem', fontWeight: 'bold' }}>
              {accountData.stats.totalPayments || 0}
            </div>
            <div>Total Payments</div>
          </div>
          
          <div>
            <div style={{ color: '#ff9800', fontSize: '1.2rem', fontWeight: 'bold' }}>
              {((accountData.stats.successRate || 0) * 100).toFixed(0)}%
            </div>
            <div>Success Rate</div>
          </div>
          
          <div>
            <div style={{ color: '#2196f3', fontSize: '1.2rem', fontWeight: 'bold' }}>
              {accountData.stats.failedPayments || 0}
            </div>
            <div>Failed Payments</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCredits = () => (
    <div>
      <h3 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>💳 Purchase Credits</h3>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: '#ccc', display: 'block', marginBottom: '0.5rem' }}>
            Credit Amount
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            {[20, 50, 100, 200].map(amount => (
              <button
                key={amount}
                onClick={() => setPurchaseForm(prev => ({ ...prev, amount, customAmount: '' }))}
                style={{
                  background: purchaseForm.amount === amount ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                ${amount}
              </button>
            ))}
          </div>
          
          <input
            type="number"
            placeholder="Custom amount (min $5)"
            value={purchaseForm.customAmount}
            onChange={(e) => setPurchaseForm(prev => ({ ...prev, customAmount: e.target.value, amount: 0 }))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: '#ccc', display: 'block', marginBottom: '0.5rem' }}>
            Payment Method
          </label>
          <select
            value={purchaseForm.paymentMethod}
            onChange={(e) => setPurchaseForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
          >
            <option value="cash">💵 Cash Payment (Legends Red Dropbox - Pending Admin Approval)</option>
            {availablePaymentMethods.map(method => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </div>
        
        <button
          onClick={handlePurchaseCredits}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(45deg, #4CAF50, #45a049)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Processing...' : `Purchase $${purchaseForm.customAmount || purchaseForm.amount} Credits`}
        </button>
      </div>
      
      <div style={{
        background: 'rgba(76, 175, 80, 0.1)',
        border: '1px solid rgba(76, 175, 80, 0.3)',
        borderRadius: '8px',
        padding: '1rem'
      }}>
        <h4 style={{ color: '#4caf50', margin: '0 0 0.5rem 0' }}>💡 Why Buy Credits?</h4>
        <ul style={{ color: '#ccc', fontSize: '0.9rem', margin: 0, paddingLeft: '1.5rem' }}>
          <li>Instant match fee payments - no waiting for verification</li>
          <li>No need to enter payment details for each match</li>
          <li>Bulk discounts available for larger purchases</li>
          <li>Credits never expire</li>
        </ul>
      </div>
    </div>
  );

  const renderMembership = () => (
    <div>
      <h3 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>🎯 Membership Management</h3>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: '#ccc', display: 'block', marginBottom: '0.5rem' }}>
            Payment Method
          </label>
          <select
            value={membershipForm.paymentMethod}
            onChange={(e) => setMembershipForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
          >
            <option value="cash">💵 Cash Payment (Legends Red Dropbox - Pending Admin Approval)</option>
            {availablePaymentMethods.map(method => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ 
          background: 'rgba(255, 152, 0, 0.1)', 
          border: '1px solid rgba(255, 152, 0, 0.3)', 
          borderRadius: '8px', 
          padding: '1rem', 
          marginBottom: '1rem' 
        }}>
          <div style={{ color: '#ff9800', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            💰 Membership Fee: $5.00/month
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
            {accountData.trustLevel === 'new' && (
              <div style={{ color: '#ff9800', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                ⚠️ New users require admin verification
              </div>
            )}
            Active membership is required to report match results
          </div>
        </div>
        
        <button
          onClick={handlePurchaseMembership}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(45deg, #ff9800, #f57c00)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Processing...' : 'Purchase Monthly Membership ($5.00)'}
        </button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div>
      <h3 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>📋 Payment History</h3>
      
      {accountData.paymentHistory.length === 0 ? (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          color: '#ccc'
        }}>
          No payment history found
        </div>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {accountData.paymentHistory.map((payment, index) => (
            <div key={index} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <strong style={{ color: '#fff' }}>{payment.description}</strong>
                  <span style={{ 
                    marginLeft: '1rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    background: payment.type === 'membership' ? 'rgba(76, 175, 80, 0.2)' : 
                               payment.type === 'match_fee' ? 'rgba(255, 152, 0, 0.2)' : 
                               'rgba(156, 39, 176, 0.2)',
                    color: payment.type === 'membership' ? '#4caf50' : 
                           payment.type === 'match_fee' ? '#ff9800' : 
                           '#9c27b0'
                  }}>
                    {payment.type === 'membership' ? 'MEMBERSHIP' : 
                     payment.type === 'match_fee' ? 'MATCH FEE' : 
                     'CREDITS'}
                  </span>
                </div>
                <span style={{ 
                  color: '#4caf50', 
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}>
                  ${payment.amount.toFixed(2)}
                </span>
              </div>
              
              <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                <div><strong>Method:</strong> {payment.paymentMethod}</div>
                <div><strong>Date:</strong> {formatDate(payment.createdAt)}</div>
                <div><strong>Status:</strong> 
                  <span style={{ 
                    color: payment.status === 'completed' ? '#4caf50' : 
                           payment.status === 'failed' ? '#f44336' : '#ff9800',
                    marginLeft: '0.5rem'
                  }}>
                    {payment.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: isOpen ? "flex" : "none",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        paddingTop: "120px", // Account for navbar height
        paddingBottom: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          transform: `translate(${drag.x}px, ${drag.y}px)`,
          cursor: dragging ? "grabbing" : "default",
          background: "linear-gradient(120deg, #232323 80%, #2a0909 100%)",
          color: "#fff",
          border: "2px solid #e53e3e",
          borderRadius: "1.2rem",
          boxShadow: "0 0 32px #e53e3e, 0 0 40px rgba(0,0,0,0.85)",
          width: "800px",
          maxWidth: "95vw",
          maxHeight: "calc(100vh - 160px)", // Account for navbar and padding
          display: "flex",
          flexDirection: "column",
          animation: "modalBounceIn 0.5s cubic-bezier(.21,1.02,.73,1.01)",
          position: "relative",
          fontFamily: "inherit",
          boxSizing: "border-box"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          onMouseDown={onMouseDown}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#e53e3e",
            padding: "0.3rem .5rem",
            borderTopLeftRadius: "1.2rem",
            borderTopRightRadius: "1.2rem",
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
            gap: "1rem"
          }}
        >
          <h2 style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: "bold",
            textAlign: "center",
            letterSpacing: "0.02em",
            color: "#fff",
            textShadow: "0 1px 12px #000a",
            flex: 1
          }}>
            💳 Payment Dashboard
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "0.2rem",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '1rem 0', maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
        {error && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '1rem',
            color: '#f44336'
          }}>
            ⚠️ {error}
          </div>
        )}
        
        {message && (
          <div style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '1rem',
            color: '#4caf50'
          }}>
            {message}
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'credits', label: '💳 Credits', icon: '💳' },
            { id: 'membership', label: '🎯 Membership', icon: '🎯' },
            { id: 'history', label: '📋 History', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'rgba(76, 175, 80, 0.8)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#ccc',
                border: 'none',
                borderRadius: '6px 6px 0 0',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'credits' && renderCredits()}
        {activeTab === 'membership' && renderMembership()}
        {activeTab === 'history' && renderHistory()}
        </div>
      </div>
    </div>
  );
};

export default PaymentDashboard;
