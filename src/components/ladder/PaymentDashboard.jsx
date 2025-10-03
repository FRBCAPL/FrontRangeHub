/*
 * Front Range Pool Hub - Payment Management System
 * Copyright (c) 2025 FRBCAPL
 * All rights reserved.
 * 
 * This component contains proprietary payment processing algorithms and
 * financial management logic that are confidential trade secrets.
 * 
 * Payment system innovations protected by copyright:
 * - Integrated tournament fee processing
 * - Automated prize pool calculations
 * - Multi-payment provider support
 * - BCA sanctioning fee management
 * - Real-time payment status tracking
 * 
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BACKEND_URL } from '../../config.js';

const PaymentDashboard = ({ isOpen, onClose, playerEmail, isPromotionalPeriod = false }) => {
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
  
  // Trust system popup state
  const [showTrustSystemPopup, setShowTrustSystemPopup] = useState(false);
  
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

  // Refresh data periodically to catch payment status updates
  useEffect(() => {
    if (isOpen && playerEmail) {
      const interval = setInterval(() => {
        loadAccountData(false); // Don't show loading spinner for background refresh
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
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

  const loadAccountData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
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
      const isCreditPayment = membershipForm.paymentMethod === 'credits';
      
      // Handle credit payment
      if (isCreditPayment) {
        const membershipPrice = isPromotionalPeriod ? 10.00 : 10.00;
        if (accountData.credits < membershipPrice) {
          setError(`Insufficient credits. You have $${accountData.credits?.toFixed(2) || '0.00'} but need $${membershipPrice.toFixed(2)}`);
          return;
        }
        
        const response = await fetch(`${BACKEND_URL}/api/monetization/use-credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerEmail,
            amount: membershipPrice,
            description: 'Monthly Ladder Membership'
          })
        });
        
        if (response.ok) {
          setMessage('✅ Membership activated successfully using credits!');
          await loadAccountData();
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to purchase membership with credits');
        }
        return;
      }
      
      // Handle other payment methods
      const response = await fetch(`${BACKEND_URL}/api/monetization/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerEmail,
          amount: isPromotionalPeriod ? 10.00 : 10.00,
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

  const getCreditPurchaseStatusText = (status, hasPendingPayments) => {
    // If there are pending payments, show that status
    if (hasPendingPayments) {
      switch (status) {
        case 'pending_verification': return '⏳ Pending Approval';
        case 'failed': return '❌ Rejected';
        default: return '⏳ Pending Approval';
      }
    }
    
    // If no pending payments, show the status of the most recent completed payment
    switch (status) {
      case 'completed': return '✅ Approved';
      case 'failed': return '❌ Rejected';
      case 'none': return 'No Recent Purchase';
      default: return 'No Pending Payments';
    }
  };

  const getTrustLevelDisplayText = (level, hasPendingPayments) => {
    if (hasPendingPayments) {
      return 'Needs Admin Approval';
    }
    switch (level) {
      case 'trusted': return 'Instant Process';
      case 'verified': return 'Auto Process';
      default: return 'Manual Approval Required';
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
              {getCreditPurchaseStatusText(accountData.creditPurchaseStatus, accountData.paymentHistory?.hasPendingPayments)}
            </div>
          </div>
        </div>
        
        <div style={{ 
          background: isPromotionalPeriod ? 'rgba(76, 175, 80, 0.1)' : 
                     (accountData.membership?.isActive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)'),
          border: `1px solid ${isPromotionalPeriod ? 'rgba(76, 175, 80, 0.3)' : 
                               (accountData.membership?.isActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)')}`,
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{ 
            color: isPromotionalPeriod ? '#4caf50' : 
                   (accountData.membership?.isActive ? '#4caf50' : '#ff9800'),
            fontWeight: 'bold',
            marginBottom: '0.5rem'
          }}>
            {isPromotionalPeriod ? '🎉 Promotional Period Active!' : 
             (accountData.membership?.isActive ? '✅ Active Membership' : '⚠️ Membership Expired')}
          </div>
          {isPromotionalPeriod ? (
            <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
              No membership required - Just $5 match fees until Oct 31st!
            </div>
          ) : accountData.membership?.isActive ? (
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
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
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
        
        {/* Trust Level Indicator */}
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '6px',
            padding: '0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setShowTrustSystemPopup(true)}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.03)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>Trust Level:</span>
            <span style={{ 
              color: accountData.trustLevel === 'trusted' ? '#10b981' : 
                     accountData.trustLevel === 'verified' ? '#f59e0b' : '#ef4444',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}>
              {getTrustLevelDisplayText(accountData.trustLevel, accountData.paymentHistory?.hasPendingPayments)}
            </span>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>ℹ️</span>
          </div>
          <div style={{ 
            color: '#888', 
            fontSize: '0.75rem',
            textAlign: 'right',
            maxWidth: '180px'
          }}>
            {accountData.trustLevel === 'trusted' ? '10+ payments, 95%+ success' :
             accountData.trustLevel === 'verified' ? '3+ payments, 80%+ success' :
             'New user - manual approval required'}
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
          <li>Automatic monthly membership renewal</li>
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
            <option value="credits">💳 Pay with Credits (${accountData.credits?.toFixed(2) || '0.00'} available)</option>
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
            💰 Membership Fee: ${isPromotionalPeriod ? '10.00' : '10.00'}/month
            {isPromotionalPeriod && <span style={{ color: '#4caf50', fontSize: '0.8rem', marginLeft: '0.5rem' }}>🎉 Promotional Period!</span>}
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
            {accountData.trustLevel === 'new' && (
              <div style={{ color: '#ff9800', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                ⚠️ New users require admin verification
              </div>
            )}
            {isPromotionalPeriod ? 
              '🎉 Promotional period - No membership required!' : 
              'Active membership is required to report match results'
            }
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
          {loading ? 'Processing...' : `Purchase Monthly Membership ($${isPromotionalPeriod ? '10.00' : '10.00'})`}
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

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 15000,
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
            onClick={loadAccountData}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "0.2rem",
              marginRight: "10px"
            }}
            title="Refresh Payment Data"
          >
            🔄
          </button>
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
      
      {/* Trust System Popup */}
      {showTrustSystemPopup && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 25000,
          backdropFilter: 'blur(5px)',
          padding: '1rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            borderRadius: '12px',
            padding: window.innerWidth <= 768 ? '1.5rem' : '2rem',
            width: '40vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowTrustSystemPopup(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '50%',
                width: '2rem',
                height: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              ×
            </button>
            
            <h2 style={{ 
              color: '#fff', 
              marginBottom: '1.2rem', 
              fontSize: window.innerWidth <= 768 ? '1.5rem' : '1.8rem',
              textAlign: 'center',
              marginTop: '0.5rem'
            }}>
              🛡️ Trust System Explained
            </h2>
            
            <div style={{ color: '#ccc', lineHeight: '1.6' }}>
              <p style={{ 
                marginBottom: '1.2rem', 
                fontSize: window.innerWidth <= 768 ? '1rem' : '1.1rem',
                textAlign: 'center'
              }}>
                Our trust system determines how quickly your <strong>cash, Venmo, and Cash App payments</strong> are processed. 
                Credit card payments through Square are always processed instantly.
              </p>
              
              {/* Credit Card Section - Highlighted */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                borderRadius: '8px',
                padding: '1rem',
                border: '2px solid rgba(16, 185, 129, 0.3)',
                marginBottom: '1rem'
              }}>
                <h4 style={{ 
                  color: '#10b981', 
                  marginBottom: '0.7rem',
                  fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.3rem',
                  textAlign: 'center'
                }}>💳 Credit Cards & Credits</h4>
                <div style={{ 
                  fontSize: window.innerWidth <= 768 ? '0.95rem' : '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ marginBottom: '0.4rem' }}>• Credit cards processed instantly through Square</div>
                  <div style={{ marginBottom: '0.4rem' }}>• Use credits for instant processing</div>
                  <div style={{ marginBottom: '0.4rem' }}>• No trust level required</div>
                  <div style={{ fontSize: '0.9rem', color: '#888', marginTop: '0.6rem' }}>
                    <strong>Note:</strong> Credit cards verified by Square • Credits verified by system
                  </div>
                </div>
              </div>
              
              {/* Trust Levels Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                {/* New User */}
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <h4 style={{ 
                    color: '#ef4444', 
                    marginBottom: '0.7rem',
                    fontSize: window.innerWidth <= 768 ? '1.05rem' : '1.2rem',
                    textAlign: 'center'
                  }}>🔴 New User</h4>
                  <div style={{ 
                    fontSize: window.innerWidth <= 768 ? '0.9rem' : '0.95rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: '0.4rem' }}>• Manual approval required</div>
                    <div style={{ marginBottom: '0.4rem' }}>• Admin verification needed</div>
                    <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.6rem' }}>
                      <strong>0-2 payments</strong>
                    </div>
                  </div>
                </div>
                
                {/* Verified User */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                  <h4 style={{ 
                    color: '#f59e0b', 
                    marginBottom: '0.7rem',
                    fontSize: window.innerWidth <= 768 ? '1.05rem' : '1.2rem',
                    textAlign: 'center'
                  }}>🟡 Verified User</h4>
                  <div style={{ 
                    fontSize: window.innerWidth <= 768 ? '0.9rem' : '0.95rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: '0.4rem' }}>• Auto-processing</div>
                    <div style={{ marginBottom: '0.4rem' }}>• Faster processing</div>
                    <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.6rem' }}>
                      <strong>3+ payments, 80%+ success</strong>
                    </div>
                  </div>
                </div>
                
                {/* Trusted User */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <h4 style={{ 
                    color: '#10b981', 
                    marginBottom: '0.7rem',
                    fontSize: window.innerWidth <= 768 ? '1.05rem' : '1.2rem',
                    textAlign: 'center'
                  }}>🟢 Trusted User</h4>
                  <div style={{ 
                    fontSize: window.innerWidth <= 768 ? '0.9rem' : '0.95rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: '0.4rem' }}>• Instant processing</div>
                    <div style={{ marginBottom: '0.4rem' }}>• No approval needed</div>
                    <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.6rem' }}>
                      <strong>10+ payments, 95%+ success</strong>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tips Section */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h4 style={{ 
                  color: '#fff', 
                  marginBottom: '0.7rem',
                  fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.3rem',
                  textAlign: 'center'
                }}>💡 Tips to Improve Your Trust Level:</h4>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
                  gap: '0.6rem',
                  fontSize: window.innerWidth <= 768 ? '0.95rem' : '1rem',
                  textAlign: 'center'
                }}>
                  <div>• Make payments on time</div>
                  <div>• Use consistent payment methods</div>
                  <div>• Avoid failed payments</div>
                  <div>• Build positive payment history</div>
                  <div style={{ 
                    gridColumn: window.innerWidth <= 768 ? '1' : '1 / -1',
                    color: '#10b981',
                    fontWeight: 'bold',
                    marginTop: '0.3rem'
                  }}>
                    • Use credit cards or credits for instant processing!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};

export default PaymentDashboard;
