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
import { BACKEND_URL } from '@shared/config/config.js';
import { getCurrentPhase } from '@shared/utils/utils/phaseSystem.js';

const PaymentDashboard = ({ isOpen, onClose, playerEmail, isFreePeriod }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Account data
  const [accountData, setAccountData] = useState({
    credits: 0,
    totalPurchased: 0,
    totalUsed: 0,
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
  const [checkPaymentLoading, setCheckPaymentLoading] = useState(false);
  
  // Draggable state
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Mobile detection for responsive layout
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)');
    if (!mq) return;
    const handle = () => setIsMobile(mq.matches);
    handle();
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const getPhaseInfo = () => {
    const phaseInfo = getCurrentPhase();
    if (typeof isFreePeriod === 'boolean') {
      return {
        ...phaseInfo,
        phase: 1,
        name: 'Testing',
        description: 'Free period active',
        membershipFee: 0,
        color: '#4caf50',
        icon: '🧪',
        isFree: isFreePeriod
      };
    }
    return phaseInfo;
  };

  useEffect(() => {
    if (isOpen && playerEmail) {
      loadAccountData();
      loadPaymentMethods();
      const hash = window.location.hash || '';
      const hashParams = hash.includes('?') ? new URLSearchParams(hash.slice(hash.indexOf('?') + 1)) : null;
      const searchParams = typeof window !== 'undefined' && window.location.search ? new URLSearchParams(window.location.search) : null;
      const pathname = typeof window !== 'undefined' ? (window.location.pathname || '') : '';
      const fromPathMatch = pathname.match(/transactionId=([^&/]+)/i) || pathname.match(/transaction_id=([^&/]+)/i);
      const transactionId = hashParams?.get('transactionId') || hashParams?.get('transaction_id')
        || searchParams?.get('transactionId') || searchParams?.get('transaction_id')
        || (fromPathMatch ? fromPathMatch[1] : null);
      let fromCreditPurchaseReturn = hashParams?.get('credit_purchase_success') === '1' || searchParams?.get('credit_purchase_success') === '1';
      let fromMembershipPurchaseReturn = hashParams?.get('membership_purchase_success') === '1' || searchParams?.get('membership_purchase_success') === '1';
      try {
        if (sessionStorage.getItem('credit_purchase_return') === '1') fromCreditPurchaseReturn = true;
        if (hashParams?.get('membership_purchase_success') === '1' || searchParams?.get('membership_purchase_success') === '1') fromMembershipPurchaseReturn = true;
      } catch (_) {}

      const runCompletion = async () => {
        try {
          if (transactionId) {
            const res = await fetch(`${BACKEND_URL}/api/monetization/complete-credit-purchase-return`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transactionId, playerEmail })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
              setMessage(data.alreadyProcessed ? 'Credits were already added.' : `✅ Payment successful! Credits added. New balance: $${(data.newBalance || 0).toFixed(2)}`);
              setError('');
              setActiveTab('overview');
              await loadAccountData(false);
              return;
            }
            const isNotCredit = res.status === 400 && (data.message || '').toLowerCase().includes('not a credit');
            if (isNotCredit) {
              const memRes = await fetch(`${BACKEND_URL}/api/monetization/complete-membership-purchase-return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId, playerEmail })
              });
              const memData = await memRes.json().catch(() => ({}));
              if (memRes.ok && memData.membershipUpdated) {
                setMessage('✅ Membership activated! Thank you for your payment.');
                setError('');
                setActiveTab('overview');
                await loadAccountData(false);
                return;
              }
              setMessage(memData.message || 'Could not complete membership. Try "Check for my payment" or contact support.');
            }
          }
          if (fromMembershipPurchaseReturn) {
            const memRes = await fetch(`${BACKEND_URL}/api/monetization/check-and-complete-membership-purchase`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playerEmail })
            });
            const memData = await memRes.json().catch(() => ({}));
            if (memRes.ok && memData.membershipUpdated) {
              setMessage('✅ Membership activated! Thank you for your payment.');
              setError('');
              setActiveTab('overview');
            }
            await loadAccountData(false);
          }
          if (fromCreditPurchaseReturn && !fromMembershipPurchaseReturn) {
            const res = await fetch(`${BACKEND_URL}/api/monetization/check-and-complete-credit-purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerEmail })
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) {
            setMessage(data.alreadyProcessed ? 'Credits were already added.' : `✅ Payment successful! $${(data.amount || 0).toFixed(2)} credits added. New balance: $${(data.newBalance || 0).toFixed(2)}`);
            setError('');
            setActiveTab('overview');
            await loadAccountData(false);
          } else if (fromCreditPurchaseReturn) {
            setMessage(data.message || 'Checking for your payment… If you just paid, try opening this dashboard again in a few seconds.');
            setError('');
            loadAccountData(false);
          }
          }
        } catch (_) {
          if (fromCreditPurchaseReturn) {
            setMessage('Payment completed. If credits don’t appear, click "Check for my payment" below.');
            loadAccountData(false);
          }
          if (fromMembershipPurchaseReturn) {
            setMessage('Payment completed. If membership does not update, open this dashboard again or contact support.');
            loadAccountData(false);
          }
        } finally {
          try { sessionStorage.removeItem('credit_purchase_return'); } catch (_) {}
          if (fromCreditPurchaseReturn || fromMembershipPurchaseReturn || transactionId) {
            let cleanHash = hash
              .replace(/[?&]credit_purchase_success=1&?/g, '')
              .replace(/[?&]membership_purchase_success=1&?/g, '')
              .replace(/[?&]transactionId=[^&]+&?/g, '')
              .replace(/[?&]transaction_id=[^&]+&?/g, '')
              .replace(/[?&]orderId=[^&]+&?/g, '')
              .replace(/\?&/, '?').replace(/\?$/, '') || '#/ladder';
            let cleanSearch = (window.location.search || '').replace(/[?&]membership_purchase_success=1&?/g, '').replace(/[?&]credit_purchase_success=1&?/g, '').replace(/[?&]transactionId=[^&]+&?/g, '').replace(/[?&]transaction_id=[^&]+&?/g, '').replace(/[?&]orderId=[^&]+&?/g, '').replace(/\?&/, '?').replace(/\?$/, '');
            const p = window.location.pathname || '';
            const cleanPath = (p.includes('transactionId') || p.includes('orderId') || p.includes('transaction_id')) ? '/' : p;
            if (cleanHash !== hash || cleanSearch !== (window.location.search || '') || cleanPath !== p) window.history.replaceState(null, '', cleanPath + cleanSearch + cleanHash);
          }
        }
      };

      if (transactionId || fromCreditPurchaseReturn || fromMembershipPurchaseReturn) {
        runCompletion();
      }
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

  const handleRefresh = async () => {
    setCheckPaymentLoading(true);
    setError('');
    setMessage('Checking for your Square payment (credits or membership)…');
    try {
      const baseUrl = BACKEND_URL || (import.meta.env?.DEV ? 'http://localhost:8080' : '');
      const [creditRes, membershipRes] = await Promise.all([
        fetch(`${baseUrl}/api/monetization/check-and-complete-credit-purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerEmail })
        }),
        fetch(`${baseUrl}/api/monetization/check-and-complete-membership-purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerEmail })
        })
      ]);
      const creditData = await creditRes.json().catch(() => ({}));
      const membershipData = await membershipRes.json().catch(() => ({}));
      const creditOk = creditRes.ok && creditData.success;
      const membershipOk = membershipRes.ok && membershipData.membershipUpdated;
      const parts = [];
      if (creditOk) {
        parts.push(creditData.alreadyProcessed ? 'Credits were already added.' : `✅ Credits: $${(creditData.amount || 0).toFixed(2)} added. New balance: $${(creditData.newBalance || 0).toFixed(2)}`);
      }
      if (membershipOk) {
        parts.push('✅ Membership activated.');
      }
      if (parts.length) {
        setMessage(parts.join(' '));
        setError('');
      } else if (creditRes.ok && creditData.message) {
        setMessage(creditData.message);
      } else if (membershipRes.ok && membershipData.message) {
        setMessage(membershipData.message);
      } else {
        setMessage(creditData.message || membershipData.message || 'No new Square payment found. If you just paid, wait a moment and try again.');
      }
      await loadAccountData(true);
    } catch (err) {
      setError('Network error. Is the backend running on ' + (BACKEND_URL || '8080') + '?');
      setMessage('');
    } finally {
      setCheckPaymentLoading(false);
    }
  };

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
          totalPurchased: data.totalPurchased ?? 0,
          totalUsed: data.totalUsed ?? 0,
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
        totalPurchased: 0,
        totalUsed: 0,
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
        totalPurchased: 0,
        totalUsed: 0,
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
        if (data.requiresRedirect && data.paymentUrl) {
          setMessage('Redirecting to Square to complete payment...');
          window.location.href = data.paymentUrl;
          return;
        }
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
      
      // Get current phase pricing
      const phaseInfo = getPhaseInfo();
      const membershipPrice = phaseInfo.membershipFee;
      const phaseDescription = `Phase ${phaseInfo.phase} (${phaseInfo.name})`;
      
      if (membershipPrice === 0) {
        setMessage('🎉 Free membership active during testing phase - no payment required!');
        await loadAccountData();
        return;
      }
      
      // Handle credit payment
      if (isCreditPayment) {
        
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

      // Handle Square: create payment link and redirect to Square checkout
      const selectedMethod = availablePaymentMethods.find(m => m.id === membershipForm.paymentMethod);
      if (selectedMethod?.processor === 'square') {
        const baseUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin + (window.location.pathname || '/') : '';
        const returnUrl = baseUrl ? `${baseUrl}?membership_purchase_success=1` : undefined;
        const response = await fetch(`${BACKEND_URL}/api/monetization/square/create-membership-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: playerEmail,
            playerName: playerEmail?.split('@')[0] || 'Ladder Member',
            amount: Math.round(membershipPrice * 100), // cents
            redirectUrl: returnUrl
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            setMessage('Redirecting to Square to complete payment...');
            window.location.href = data.url;
            return;
          }
        }
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || 'Could not start Square checkout. Try another method or try again.');
        setLoading(false);
        return;
      }
      
      // Handle other payment methods (cash, etc.)
      const response = await fetch(`${BACKEND_URL}/api/monetization/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerEmail,
          amount: membershipPrice,
          paymentMethod: membershipForm.paymentMethod,
          description: `Monthly Ladder Membership - ${phaseDescription}`,
          type: 'membership',
          requiresVerification: false, // Let backend determine based on payment method and trust level
          notes: isCashPayment ? 
            `Cash payment at Legends red dropbox - Membership purchase ${phaseDescription}` : 
            `Membership purchase via dashboard - ${phaseDescription}`
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

  const renderOverview = () => {
    // Get current phase information
    const phaseInfo = getPhaseInfo();
    const { phase: currentPhase, membershipFee, description: phaseDescription, color: phaseColor, icon: phaseIcon } = phaseInfo;

    return (
      <div>
        {/* Current Phase Status */}
        <div style={{
          background: phaseColor,
          border: `1px solid ${phaseColor.replace('0.1', '0.3')}`,
          borderRadius: isMobile ? '6px' : '8px',
          padding: isMobile ? '0.4rem 0.5rem' : '1rem',
          marginBottom: isMobile ? '0.4rem' : '1rem',
          minWidth: 0
        }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: isMobile ? '0.2rem' : '0.5rem', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>
            {phaseIcon} Current Phase: {phaseDescription}
          </div>
          <div style={{ color: '#ccc', fontSize: isMobile ? '0.78rem' : '0.9rem' }}>
            {currentPhase === 1 && 'Free access to all features during testing phase'}
            {currentPhase === 2 && 'Trial launch with reduced pricing - 2-month cycles'}
            {currentPhase === 3 && 'Full launch with complete prize pool system - 3-month cycles'}
          </div>
        </div>

        {/* Account Status Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: isMobile ? '6px' : '8px',
          padding: isMobile ? '0.4rem 0.5rem' : '1rem',
          marginBottom: isMobile ? '0.4rem' : '1rem',
          minWidth: 0
        }}>
          <h3 style={{ color: '#fff', margin: isMobile ? '0 0 0.35rem 0' : '0 0 1rem 0', fontSize: isMobile ? '0.9rem' : '1.2rem' }}>📊 Account Status</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: isMobile ? '0.4rem' : '1rem', marginBottom: isMobile ? '0.35rem' : '1rem', minWidth: 0 }}>
            <div>
              <div style={{ color: '#ccc', fontSize: isMobile ? '0.85rem' : '0.9rem', marginBottom: '0.25rem' }}>Available Credits</div>
              <div style={{ color: '#4caf50', fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 'bold' }}>
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
            background: membershipFee === 0 ? 'rgba(76, 175, 80, 0.1)' :
                       (accountData.membership?.isActive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)'),
            border: `1px solid ${membershipFee === 0 ? 'rgba(76, 175, 80, 0.3)' :
                                 (accountData.membership?.isActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)')}`,
            borderRadius: isMobile ? '6px' : '8px',
            padding: isMobile ? '0.35rem 0.5rem' : '1rem'
          }}>
            <div style={{
              color: membershipFee === 0 ? '#4caf50' :
                     (accountData.membership?.isActive ? '#4caf50' : '#ff9800'),
              fontWeight: 'bold',
              marginBottom: isMobile ? '0.2rem' : '0.5rem',
              fontSize: isMobile ? '0.8rem' : undefined
            }}>
              {membershipFee === 0 ? '🎉 Free Membership Active!' : 
               (accountData.membership?.isActive ? '✅ Active Membership' : '⚠️ Membership Required')}
            </div>
            {membershipFee === 0 ? (
              <div style={{ color: '#ccc', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>
                No payment required during Phase 1 testing period
              </div>
            ) : accountData.membership?.isActive ? (
              <div style={{ color: '#ccc', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>
                Expires: {formatDate(accountData.membership.expiresAt)}
              </div>
            ) : (
              <div style={{ color: '#ccc', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>
                {currentPhase === 2 && 'Trial launch membership required to report matches'}
                {currentPhase === 3 && 'Full membership required to report matches'}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: isMobile ? '6px' : '8px',
        padding: isMobile ? '0.4rem 0.5rem' : '1rem',
        marginBottom: isMobile ? '0.4rem' : '1rem',
        minWidth: 0
      }}>
        <h3 style={{ color: '#fff', margin: isMobile ? '0 0 0.35rem 0' : '0 0 1rem 0', fontSize: isMobile ? '0.9rem' : '1.2rem' }}>⚡ Quick Actions</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: isMobile ? '0.35rem' : '1rem', minWidth: 0 }}>
          <button
            onClick={() => setActiveTab('credits')}
            style={{
              background: 'linear-gradient(45deg, #4CAF50, #45a049)',
              color: 'white',
              border: 'none',
              borderRadius: isMobile ? '6px' : '8px',
              padding: isMobile ? '0.5rem 0.4rem' : '1rem',
              cursor: 'pointer',
              fontSize: isMobile ? '0.85rem' : '1rem',
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
              borderRadius: isMobile ? '6px' : '8px',
              padding: isMobile ? '0.5rem 0.4rem' : '1rem',
              cursor: 'pointer',
              fontSize: isMobile ? '0.85rem' : '1rem',
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

      {/* Payment Statistics - single row on mobile to save height */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: isMobile ? '6px' : '8px',
        padding: isMobile ? '0.35rem 0.5rem' : '1rem',
        minWidth: 0
      }}>
        <h3 style={{ color: '#fff', margin: isMobile ? '0 0 0.35rem 0' : '0 0 1rem 0', fontSize: isMobile ? '0.9rem' : '1.2rem' }}>📈 Payment Statistics</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : '1fr 1fr 1fr', gap: isMobile ? '0.35rem' : '1rem', color: '#ccc', fontSize: isMobile ? '0.75rem' : '0.9rem', marginBottom: isMobile ? '0.35rem' : '1rem', minWidth: 0 }}>
          <div>
            <div style={{ color: '#4caf50', fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 'bold' }}>
              {accountData.stats.totalPayments || 0}
            </div>
            <div>Total Payments</div>
          </div>
          
          <div>
            <div style={{ color: '#ff9800', fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 'bold' }}>
              {((accountData.stats.successRate || 0) * 100).toFixed(0)}%
            </div>
            <div>Success Rate</div>
          </div>
          
          <div>
            <div style={{ color: '#2196f3', fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 'bold' }}>
              {accountData.stats.failedPayments || 0}
            </div>
            <div>Failed Payments</div>
          </div>
        </div>
        
        {/* Trust Level Indicator */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: isMobile ? '4px' : '6px',
            padding: isMobile ? '0.3rem 0.5rem' : '0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setShowTrustSystemPopup(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.5rem' }}>
            <span style={{ color: '#fff', fontSize: isMobile ? '0.78rem' : '0.9rem', fontWeight: '500' }}>Trust Level:</span>
            <span style={{
              color: accountData.trustLevel === 'trusted' ? '#10b981' :
                     accountData.trustLevel === 'verified' ? '#f59e0b' : '#ef4444',
              fontSize: isMobile ? '0.78rem' : '0.9rem',
              fontWeight: 'bold'
            }}>
              {getTrustLevelDisplayText(accountData.trustLevel, accountData.paymentHistory?.hasPendingPayments)}
            </span>
            <span style={{ color: '#888', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>ℹ️</span>
          </div>
          <div style={{
            color: '#888',
            fontSize: isMobile ? '0.65rem' : '0.75rem',
            textAlign: 'right',
            maxWidth: isMobile ? '100px' : '180px'
          }}>
            {accountData.trustLevel === 'trusted' ? '10+ payments, 95%+ success' :
             accountData.trustLevel === 'verified' ? '3+ payments, 80%+ success' :
             'New user - manual approval required'}
          </div>
        </div>
      </div>
      </div>
    );
  };

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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem', minWidth: 0 }}>
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

  const renderMembership = () => {
    // Get current phase information
    const phaseInfo = getPhaseInfo();
    const { phase: currentPhase, membershipFee, description: phaseDescription, color: phaseColor, icon: phaseIcon } = phaseInfo;

    return (
      <div>
        <h3 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>🎯 Membership Management</h3>
        
        {/* Current Phase Information */}
        <div style={{
          background: phaseColor,
          border: `1px solid ${phaseColor.replace('0.1', '0.3')}`,
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            {phaseIcon} Phase {currentPhase}: {phaseDescription}
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
            {currentPhase === 1 && 'Free membership during testing phase - Full access to all features'}
            {currentPhase === 2 && 'Trial launch period - 2-month membership cycles with reduced pricing'}
            {currentPhase === 3 && 'Full launch with 3-month membership cycles and complete prize pool system'}
          </div>
        </div>

        {/* Phase System Explanation */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '1rem' }}>
            📋 3-Phase Membership System
          </div>
          <div style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: '1.4' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#4caf50' }}>🧪 Phase 1 (Testing):</strong> Free access to test all features and build the community
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#ff9800' }}>🚀 Phase 2 (Trial Launch):</strong> $5/month - Reduced pricing for early adopters with 2-month cycles
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#9c27b0' }}>🎯 Phase 3 (Full Launch):</strong> $5/month - Complete prize pool system with 3-month cycles
            </div>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '0.75rem', 
              borderRadius: '6px', 
              marginTop: '0.75rem',
              fontSize: '0.8rem'
            }}>
              <strong>💡 Why the phases?</strong><br/>
              • Phase 1: Test features and build player base<br/>
              • Phase 2: Validate pricing and system with reduced rates<br/>
              • Phase 3: Full monetization with complete prize pool funding
            </div>
          </div>
        </div>

        {membershipFee > 0 && (
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
                💰 Membership Fee: ${membershipFee.toFixed(2)}/month
                {currentPhase === 1 && <span style={{ color: '#4caf50', fontSize: '0.8rem', marginLeft: '0.5rem' }}>🎉 FREE!</span>}
                {currentPhase === 2 && <span style={{ color: '#ff9800', fontSize: '0.8rem', marginLeft: '0.5rem' }}>🚀 Trial Pricing!</span>}
              </div>
              <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                {accountData.trustLevel === 'new' && (
                  <div style={{ color: '#ff9800', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    ⚠️ New users require admin verification
                  </div>
                )}
                {currentPhase === 1 && 'Free access during testing phase - No payment required'}
                {currentPhase === 2 && 'Trial launch pricing - Active membership required to report match results'}
                {currentPhase === 3 && 'Full launch pricing - Active membership required to report match results'}
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
              {loading ? 'Processing...' : `Purchase Monthly Membership ($${membershipFee.toFixed(2)})`}
            </button>
          </div>
        )}

        {membershipFee === 0 && (
          <div style={{
            background: 'rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center',
            color: '#4caf50'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              🎉 Free Membership Active!
            </div>
            <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
              You have full access to all ladder features during the testing phase.
              No payment required until Phase 2 begins.
            </div>
          </div>
        )}
      </div>
    );
  };

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
        paddingTop: isMobile ? "52px" : "120px",
        paddingBottom: isMobile ? "0.5rem" : "20px",
        paddingLeft: isMobile ? "0.25rem" : undefined,
        paddingRight: isMobile ? "0.25rem" : undefined
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
          borderRadius: isMobile ? "0.75rem" : "1.2rem",
          boxShadow: "0 0 32px #e53e3e, 0 0 40px rgba(0,0,0,0.85)",
          width: isMobile ? "100%" : "800px",
          maxWidth: isMobile ? "100%" : "95vw",
          minWidth: 0,
          height: isMobile ? "calc(100vh - 1rem)" : undefined,
          maxHeight: isMobile ? "calc(100vh - 1rem)" : "calc(100vh - 160px)",
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
            padding: isMobile ? "0.35rem 0.4rem" : "0.3rem .5rem",
            borderTopLeftRadius: isMobile ? "0.75rem" : "1.2rem",
            borderTopRightRadius: isMobile ? "0.75rem" : "1.2rem",
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
            gap: isMobile ? "0.4rem" : "1rem"
          }}
        >
          <h2 style={{
            margin: 0,
            fontSize: isMobile ? "0.9rem" : "1rem",
            fontWeight: "bold",
            textAlign: "center",
            letterSpacing: "0.02em",
            color: "#fff",
            textShadow: "0 1px 12px #000a",
            flex: 1,
            minWidth: 0
          }}>
            💳 Payment Dashboard {checkPaymentLoading && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.9 }}>— Checking...</span>}
          </h2>
          <button
            onClick={handleRefresh}
            disabled={checkPaymentLoading}
            style={{
              background: checkPaymentLoading ? 'rgba(255,255,255,0.2)' : 'transparent',
              border: "none",
              color: "#fff",
              fontSize: "1.2rem",
              cursor: checkPaymentLoading ? "wait" : "pointer",
              padding: "0.35rem 0.5rem",
              marginRight: "10px",
              borderRadius: '4px'
            }}
            title="Check for recent Square payment and refresh"
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

        {/* Modal Content - scrollable fallback; mobile layout kept compact to fit without scrolling */}
        <div style={{
          padding: isMobile ? '0.4rem 0.35rem' : '1rem 0',
          flex: isMobile ? '1 1 0' : undefined,
          minHeight: isMobile ? 0 : undefined,
          maxHeight: isMobile ? 'none' : 'calc(100vh - 240px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          minWidth: 0
        }}>
        {error && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: '6px',
            padding: isMobile ? '6px 8px' : '12px',
            marginBottom: isMobile ? '0.4rem' : '1rem',
            color: '#f44336',
            fontSize: isMobile ? '0.8rem' : '1rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div style={{
            background: message.startsWith('✅') ? 'rgba(76, 175, 80, 0.25)' : 'rgba(76, 175, 80, 0.1)',
            border: '2px solid rgba(76, 175, 80, 0.5)',
            borderRadius: isMobile ? '6px' : '8px',
            padding: isMobile ? '8px 10px' : '14px 16px',
            marginBottom: isMobile ? '0.4rem' : '1rem',
            color: '#fff',
            fontWeight: message.startsWith('✅') ? 'bold' : 'normal',
            fontSize: isMobile ? (message.startsWith('✅') ? '0.9rem' : '0.85rem') : (message.startsWith('✅') ? '1.05rem' : '0.95rem')
          }}>
            {message}
          </div>
        )}

        {/* Always-visible: Check for Square payment */}
        <div style={{ marginBottom: isMobile ? '0.4rem' : '1rem', padding: isMobile ? '0.4rem 0.5rem' : '1rem', background: 'rgba(33, 150, 243, 0.15)', borderRadius: isMobile ? '6px' : '8px', border: '2px solid rgba(33, 150, 243, 0.5)', minWidth: 0 }}>
          <div style={{ color: '#90caf9', fontWeight: 'bold', marginBottom: isMobile ? '0.25rem' : '0.5rem', fontSize: isMobile ? '0.8rem' : '1rem' }}>Just paid with Square? (credits or membership)</div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={checkPaymentLoading}
            style={{
              width: '100%',
              padding: isMobile ? '0.4rem 0.6rem' : '0.75rem 1rem',
              background: checkPaymentLoading ? 'rgba(255,255,255,0.1)' : 'rgba(33, 150, 243, 0.5)',
              color: '#fff',
              border: '2px solid rgba(33, 150, 243, 0.8)',
              borderRadius: isMobile ? '6px' : '8px',
              cursor: checkPaymentLoading ? 'wait' : 'pointer',
              fontSize: isMobile ? '0.85rem' : '1rem',
              fontWeight: 'bold'
            }}
          >
            {checkPaymentLoading ? 'Checking…' : 'Check for my payment'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          gap: isMobile ? '0.25rem' : '0.5rem',
          marginBottom: isMobile ? '0.4rem' : '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          minWidth: 0
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
                padding: isMobile ? '0.35rem 0.45rem' : '0.75rem 1rem',
                cursor: 'pointer',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                flex: isMobile ? '1 1 auto' : undefined,
                minWidth: isMobile ? 0 : undefined
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
      
      {/* Trust System Popup - mobile optimized */}
      {showTrustSystemPopup && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trust-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'center',
            zIndex: 25000,
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            padding: isMobile ? '52px 0.5rem 0.5rem' : '56px 1rem 1rem',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            boxSizing: 'border-box'
          }}
          onClick={(e) => e.target === e.currentTarget && setShowTrustSystemPopup(false)}
        >
          <div style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            borderRadius: isMobile ? '8px' : '12px',
            padding: isMobile ? '0.75rem 0.85rem' : '2rem',
            width: isMobile ? '100%' : '40vw',
            maxWidth: isMobile ? '100%' : '420px',
            maxHeight: isMobile ? 'none' : '90vh',
            minWidth: 0,
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            margin: isMobile ? '0 auto' : undefined
          }}>
            <button
              type="button"
              onClick={() => setShowTrustSystemPopup(false)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: isMobile ? '0.5rem' : '1rem',
                right: isMobile ? '0.5rem' : '1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                fontSize: isMobile ? '1.25rem' : '1.2rem',
                cursor: 'pointer',
                padding: isMobile ? '0.5rem' : '0.5rem',
                borderRadius: '50%',
                width: isMobile ? '44px' : '2rem',
                height: isMobile ? '44px' : '2rem',
                minWidth: isMobile ? '44px' : undefined,
                minHeight: isMobile ? '44px' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
            >
              ×
            </button>

            <h2 id="trust-modal-title" style={{
              color: '#fff',
              marginBottom: isMobile ? '0.5rem' : '1.2rem',
              marginTop: isMobile ? '0.25rem' : '0.5rem',
              paddingRight: isMobile ? '44px' : undefined,
              fontSize: isMobile ? '1.15rem' : '1.8rem',
              textAlign: 'center'
            }}>
              🛡️ Trust System Explained
            </h2>

            <div style={{ color: '#ccc', lineHeight: isMobile ? '1.45' : '1.6' }}>
              <p style={{
                marginBottom: isMobile ? '0.6rem' : '1.2rem',
                fontSize: isMobile ? '0.88rem' : '1.1rem',
                textAlign: 'center'
              }}>
                Our trust system determines how quickly your <strong>cash, Venmo, and Cash App payments</strong> are processed.
                Credit card payments through Square are always processed instantly.
              </p>

              {/* Credit Card Section - Highlighted */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                borderRadius: isMobile ? '6px' : '8px',
                padding: isMobile ? '0.5rem 0.6rem' : '1rem',
                border: '2px solid rgba(16, 185, 129, 0.3)',
                marginBottom: isMobile ? '0.5rem' : '1rem'
              }}>
                <h4 style={{
                  color: '#10b981',
                  marginBottom: isMobile ? '0.35rem' : '0.7rem',
                  fontSize: isMobile ? '0.95rem' : '1.3rem',
                  textAlign: 'center'
                }}>💳 Credit Cards & Credits</h4>
                <div style={{
                  fontSize: isMobile ? '0.82rem' : '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ marginBottom: isMobile ? '0.2rem' : '0.4rem' }}>• Credit cards processed instantly through Square</div>
                  <div style={{ marginBottom: isMobile ? '0.2rem' : '0.4rem' }}>• Use credits for instant processing</div>
                  <div style={{ marginBottom: isMobile ? '0.2rem' : '0.4rem' }}>• No trust level required</div>
                  <div style={{ fontSize: isMobile ? '0.78rem' : '0.9rem', color: '#888', marginTop: isMobile ? '0.35rem' : '0.6rem' }}>
                    <strong>Note:</strong> Credit cards verified by Square • Credits verified by system
                  </div>
                </div>
              </div>

              {/* Trust Levels Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: isMobile ? '0.4rem' : '1rem',
                marginBottom: isMobile ? '0.5rem' : '1rem'
              }}>
                {/* New User */}
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: isMobile ? '6px' : '8px',
                  padding: isMobile ? '0.5rem 0.6rem' : '1rem',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <h4 style={{
                    color: '#ef4444',
                    marginBottom: isMobile ? '0.3rem' : '0.7rem',
                    fontSize: isMobile ? '0.9rem' : '1.2rem',
                    textAlign: 'center'
                  }}>🔴 New User</h4>
                  <div style={{
                    fontSize: isMobile ? '0.8rem' : '0.95rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: isMobile ? '0.2rem' : '0.4rem' }}>• Manual approval required</div>
                    <div style={{ marginBottom: isMobile ? '0.2rem' : '0.4rem' }}>• Admin verification needed</div>
                    <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#888', marginTop: isMobile ? '0.3rem' : '0.6rem' }}>
                      <strong>0-2 payments</strong>
                    </div>
                  </div>
                </div>

                {/* Verified User */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: isMobile ? '6px' : '8px',
                  padding: isMobile ? '0.5rem 0.6rem' : '1rem',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                  <h4 style={{
                    color: '#f59e0b',
                    marginBottom: isMobile ? '0.3rem' : '0.7rem',
                    fontSize: isMobile ? '0.9rem' : '1.2rem',
                    textAlign: 'center'
                  }}>🟡 Verified User</h4>
                  <div style={{
                    fontSize: isMobile ? '0.8rem' : '0.95rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: isMobile ? '0.2rem' : '0.4rem' }}>• Auto-processing</div>
                    <div style={{ marginBottom: isMobile ? '0.2rem' : '0.4rem' }}>• Faster processing</div>
                    <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#888', marginTop: isMobile ? '0.3rem' : '0.6rem' }}>
                      <strong>3+ payments, 80%+ success</strong>
                    </div>
                  </div>
                </div>

                {/* Trusted User */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: isMobile ? '6px' : '8px',
                  padding: isMobile ? '0.5rem 0.6rem' : '1rem',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <h4 style={{
                    color: '#10b981',
                    marginBottom: isMobile ? '0.3rem' : '0.7rem',
                    fontSize: isMobile ? '0.9rem' : '1.2rem',
                    textAlign: 'center'
                  }}>🟢 Trusted User</h4>
                  <div style={{
                    fontSize: isMobile ? '0.8rem' : '0.95rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ marginBottom: isMobile ? '0.2rem' : '0.4rem' }}>• Instant processing</div>
                    <div style={{ marginBottom: isMobile ? '0.2rem' : '0.4rem' }}>• No approval needed</div>
                    <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#888', marginTop: isMobile ? '0.3rem' : '0.6rem' }}>
                      <strong>10+ payments, 95%+ success</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips Section */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: isMobile ? '6px' : '8px',
                padding: isMobile ? '0.5rem 0.6rem' : '1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h4 style={{
                  color: '#fff',
                  marginBottom: isMobile ? '0.35rem' : '0.7rem',
                  fontSize: isMobile ? '0.95rem' : '1.3rem',
                  textAlign: 'center'
                }}>💡 Tips to Improve Your Trust Level:</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: isMobile ? '0.3rem' : '0.6rem',
                  fontSize: isMobile ? '0.82rem' : '1rem',
                  textAlign: 'center'
                }}>
                  <div>• Make payments on time</div>
                  <div>• Use consistent payment methods</div>
                  <div>• Avoid failed payments</div>
                  <div>• Build positive payment history</div>
                  <div style={{
                    gridColumn: isMobile ? '1' : '1 / -1',
                    color: '#10b981',
                    fontWeight: 'bold',
                    marginTop: isMobile ? '0.2rem' : '0.3rem'
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
