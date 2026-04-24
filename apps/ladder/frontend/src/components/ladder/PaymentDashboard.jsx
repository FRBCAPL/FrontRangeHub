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
 * - Credits, tournament entry, optional legacy ladder-account payments
 * - Ladder access is free; match reporting fees when winners post results ($10 standard + late/forfeit per rules)
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
import {
  REPORT_RESULTS_MENU_LABEL,
  OVERVIEW_LADDER_ACCESS_BODY,
  OVERVIEW_AFTER_MATCH_BODY,
  OVERVIEW_DASHBOARD_HERE_BODY,
  MEMBERSHIP_TAB_POST_MATCH_LINE,
  NO_MONTHLY_CREDITS_MATCH_FEES,
  OPTIONAL_TOOLS_REFERS_TO_REPORT,
  WHY_CREDITS_MATCH_REPORTING
} from '@shared/utils/utils/ladderPaymentCopy.js';
import tournamentService from '@shared/services/services/tournamentService';

const PaymentDashboard = ({ isOpen, onClose, playerEmail, isFreePeriod, paymentContext }) => {
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
  
  // Tournament entry payment
  const [tournamentEntryPaying, setTournamentEntryPaying] = useState(false);
  const [tournamentEntryMethod, setTournamentEntryMethod] = useState('credits');
  
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

  /** Dismissible “how this fits” so new users aren’t lost in tabs vs match fees vs Square lag */
  const [howItWorksHidden, setHowItWorksHidden] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    try {
      setHowItWorksHidden(sessionStorage.getItem('payment_dashboard_how_it_works_hidden') === '1');
    } catch (_) {
      setHowItWorksHidden(false);
    }
  }, [isOpen]);

  const dismissHowItWorks = () => {
    try {
      sessionStorage.setItem('payment_dashboard_how_it_works_hidden', '1');
    } catch (_) {}
    setHowItWorksHidden(true);
  };

  const getPhaseInfo = () => {
    const phaseInfo = getCurrentPhase();
    if (typeof isFreePeriod === 'boolean') {
      return {
        ...phaseInfo,
        phase: 1,
        name: 'Testing',
        description: 'Ladder access (override)',
        membershipFee: 0,
        color: '#4caf50',
        icon: '🧪',
        isFree: isFreePeriod
      };
    }
    return phaseInfo;
  };

  const tabPhaseInfo = getPhaseInfo();
  const showExtrasTab = tabPhaseInfo.membershipFee > 0;

  useEffect(() => {
    if (!isOpen) return;
    if (!showExtrasTab && activeTab === 'membership') {
      setActiveTab('overview');
    }
  }, [isOpen, showExtrasTab, activeTab]);

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
                setMessage('✅ Ladder account payment recorded. Thank you.');
                setError('');
                setActiveTab('overview');
                await loadAccountData(false);
                return;
              }
              setMessage(memData.message || 'Could not complete ladder account payment. Try "Check for my payment" or contact support.');
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
              setMessage('✅ Ladder account payment recorded. Thank you.');
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
            setMessage('Payment completed. If your account does not update, open this dashboard again or contact support.');
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
    setMessage('Checking for your Square payment (credits or ladder account)…');
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
        parts.push('✅ Ladder account payment applied.');
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
        setMessage('🎉 Ladder access is free — there is no monthly membership to purchase. Use credits for match reporting and other payments.');
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
            description: 'Ladder account (optional legacy) — ladder access is free'
          })
        });
        
        if (response.ok) {
          setMessage('✅ Ladder account payment completed using credits.');
          await loadAccountData();
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to complete ladder account payment with credits');
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
          description: `Ladder account optional payment - ${phaseDescription}`,
          type: 'membership',
          requiresVerification: false, // Let backend determine based on payment method and trust level
          notes: isCashPayment ? 
            `Cash payment at Legends red dropbox - Ladder account (optional) ${phaseDescription}` :
            `Ladder account payment via dashboard - ${phaseDescription}`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.payment?.status === 'pending_verification') {
          if (isCashPayment) {
            setMessage('✅ Cash payment recorded! Drop payment in the red dropbox at Legends. Admin will verify before your ladder account record is updated.');
          } else {
            setMessage('✅ Payment recorded! Pending admin verification.');
          }
        } else {
          setMessage('✅ Ladder account payment completed.');
        }
        await loadAccountData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to record ladder account payment');
      }
    } catch (error) {
      console.error('Error processing ladder account payment:', error);
      setError('Network error processing ladder account payment');
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

  const handlePayTournamentEntry = async () => {
    if (!paymentContext || paymentContext.type !== 'tournament_entry' || !playerEmail) return;
    const { registrationId, amount } = paymentContext;
    setTournamentEntryPaying(true);
    setError('');
    setMessage('');
    try {
      if (tournamentEntryMethod === 'credits') {
        if (accountData.credits < amount) {
          setError(`Insufficient credits. You have $${(accountData.credits || 0).toFixed(2)} but need $${amount.toFixed(2)}`);
          return;
        }
        const res = await fetch(`${BACKEND_URL}/api/monetization/use-credits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerEmail,
            amount,
            description: 'Tournament Entry Fee'
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.message || data.error || 'Failed to use credits');
          return;
        }
        const updateRes = await tournamentService.updatePaymentStatus(registrationId, 'paid');
        if (updateRes.success) {
          setMessage(`✅ Tournament entry fee paid! $${amount.toFixed(2)} deducted from credits.`);
          await loadAccountData();
          if (onClose) onClose();
        } else {
          setError('Payment recorded but registration update failed. Contact admin.');
        }
      } else if (tournamentEntryMethod === 'cash') {
        const res = await fetch(`${BACKEND_URL}/api/monetization/record-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerEmail,
            amount,
            paymentMethod: 'cash',
            type: 'tournament_entry',
            tournamentRegistrationId: registrationId,
            description: `Tournament entry fee - ${paymentContext.tournamentName || 'Tournament'}`,
            notes: `Cash payment at Legends red dropbox - Tournament entry $${amount}`
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.message || data.error || 'Failed to record cash payment');
          return;
        }
        setMessage('✅ Cash payment recorded! Drop your payment in the red dropbox at Legends. Admin will verify and confirm your entry.');
      } else {
        setError('Please select a payment method (Credits or Cash).');
      }
    } catch (err) {
      setError(err.message || 'Payment failed');
    } finally {
      setTournamentEntryPaying(false);
    }
  };

  const renderOverview = () => {
    // Get current phase information (for membership copy only; no big phase banner)
    const phaseInfo = getPhaseInfo();
    const { phase: currentPhase, membershipFee } = phaseInfo;

    return (
      <div>
        {/* Where money goes — quick scan */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? '0.35rem' : '0.65rem',
            marginBottom: isMobile ? '0.45rem' : '1rem',
            minWidth: 0
          }}
        >
          {[
            { k: 'ladder', title: 'Ladder access', body: OVERVIEW_LADDER_ACCESS_BODY, border: 'rgba(76, 175, 80, 0.45)', bg: 'rgba(76, 175, 80, 0.08)' },
            { k: 'match', title: 'After a match', body: OVERVIEW_AFTER_MATCH_BODY, border: 'rgba(255, 152, 0, 0.45)', bg: 'rgba(255, 152, 0, 0.08)' },
            { k: 'here', title: 'This dashboard', body: OVERVIEW_DASHBOARD_HERE_BODY, border: 'rgba(156, 39, 176, 0.45)', bg: 'rgba(156, 39, 176, 0.08)' }
          ].map((box) => (
            <div
              key={box.k}
              style={{
                border: `1px solid ${box.border}`,
                background: box.bg,
                borderRadius: isMobile ? '6px' : '8px',
                padding: isMobile ? '0.45rem 0.55rem' : '0.65rem 0.75rem',
                minWidth: 0
              }}
            >
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: isMobile ? '0.82rem' : '0.9rem', marginBottom: '0.2rem' }}>{box.title}</div>
              <div style={{ color: '#cfd8dc', fontSize: isMobile ? '0.74rem' : '0.82rem', lineHeight: 1.4 }}>{box.body}</div>
            </div>
          ))}
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
          <h3 style={{ color: '#fff', margin: isMobile ? '0 0 0.2rem 0' : '0 0 0.35rem 0', fontSize: isMobile ? '0.9rem' : '1.2rem' }}>📊 Wallet & status</h3>
          <div style={{ color: '#90a4ae', fontSize: isMobile ? '0.72rem' : '0.8rem', marginBottom: isMobile ? '0.35rem' : '0.65rem', lineHeight: 1.4 }}>
            <strong style={{ color: '#cfd8dc' }}>Credits</strong> are optional money on your account for things like tournament entry and faster checkout. They are not the same as paying a <strong style={{ color: '#cfd8dc' }}>match reporting fee</strong> after a win (that happens in {REPORT_RESULTS_MENU_LABEL} on the ladder).
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: isMobile ? '0.4rem' : '1rem', marginBottom: isMobile ? '0.35rem' : '1rem', minWidth: 0 }}>
            <div>
              <div style={{ color: '#ccc', fontSize: isMobile ? '0.85rem' : '0.9rem', marginBottom: '0.25rem' }}>Available Credits</div>
              <div style={{ color: '#4caf50', fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 'bold' }}>
                ${accountData.credits.toFixed(2)}
              </div>
            </div>
            
            <div title="Status of credit purchases (card or cash pending approval), not ladder membership.">
              <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Credit top-ups</div>
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
            background: membershipFee === 0 ? 'rgba(255, 255, 255, 0.04)' :
                       (accountData.membership?.isActive ? 'rgba(76, 175, 80, 0.08)' : 'rgba(255, 152, 0, 0.1)'),
            border: `1px solid ${membershipFee === 0 ? 'rgba(255, 255, 255, 0.12)' :
                                 (accountData.membership?.isActive ? 'rgba(76, 175, 80, 0.28)' : 'rgba(255, 152, 0, 0.3)')}`,
            borderRadius: isMobile ? '6px' : '8px',
            padding: isMobile ? '0.35rem 0.5rem' : '1rem'
          }}>
            <div style={{
              color: membershipFee === 0 ? '#e0e0e0' :
                     (accountData.membership?.isActive ? '#81c784' : '#ff9800'),
              fontWeight: 'bold',
              marginBottom: isMobile ? '0.2rem' : '0.5rem',
              fontSize: isMobile ? '0.8rem' : undefined
            }}>
              {membershipFee === 0 ? 'No monthly ladder fee' :
               (accountData.membership?.isActive ? '✅ Legacy account on file' : 'Optional legacy account payment')}
            </div>
            {membershipFee === 0 ? (
              <div style={{ color: '#ccc', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>
                {NO_MONTHLY_CREDITS_MATCH_FEES}
              </div>
            ) : accountData.membership?.isActive ? (
              <div style={{ color: '#ccc', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>
                Expires: {formatDate(accountData.membership.expiresAt)}
              </div>
            ) : (
              <div style={{ color: '#ccc', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>
                {currentPhase === 2 && 'Trial launch: free ladder access; match reporting fees when you post results'}
                {currentPhase === 3 && 'Full launch: free ladder access; match reporting fees when you post results'}
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
        <h3 style={{ color: '#fff', margin: isMobile ? '0 0 0.35rem 0' : '0 0 1rem 0', fontSize: isMobile ? '0.9rem' : '1.2rem' }}>⚡ Quick actions</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : (showExtrasTab ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'), gap: isMobile ? '0.35rem' : '1rem', minWidth: 0 }}>
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
            {isMobile ? '➕ Add credits' : '💳 Add credits'}
          </button>
          
          {showExtrasTab ? (
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
              {isMobile ? '💡 Extras' : '💡 Extras (rare)'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              background: 'linear-gradient(45deg, #455a64, #37474f)',
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
              gap: '0.5rem',
              gridColumn: isMobile ? '1 / -1' : undefined
            }}
          >
            📋 Receipts
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
        <h3 style={{ color: '#fff', margin: isMobile ? '0 0 0.2rem 0' : '0 0 0.35rem 0', fontSize: isMobile ? '0.9rem' : '1.2rem' }}>📈 Activity from this dashboard</h3>
        <div style={{ color: '#78909c', fontSize: isMobile ? '0.7rem' : '0.78rem', marginBottom: isMobile ? '0.35rem' : '0.75rem', lineHeight: 1.35 }}>
          Counts credit top-ups and other purchases <strong style={{ color: '#b0bec5' }}>through this screen</strong> — not match reporting fees from {REPORT_RESULTS_MENU_LABEL}.
        </div>
        
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
            <span style={{ color: '#fff', fontSize: isMobile ? '0.78rem' : '0.9rem', fontWeight: '500' }}>Card purchase trust:</span>
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
      <h3 style={{ color: '#fff', margin: '0 0 0.35rem 0', fontSize: '1.2rem' }}>💳 Add credits</h3>
      <p style={{ color: '#bdbdbd', fontSize: isMobile ? '0.82rem' : '0.9rem', lineHeight: 1.45, margin: '0 0 1rem 0' }}>
        Add money to your wallet for <strong style={{ color: '#e0e0e0' }}>tournament entry</strong> and <strong style={{ color: '#e0e0e0' }}>faster checkout</strong> (for example when paying from {REPORT_RESULTS_MENU_LABEL}). You do <strong style={{ color: '#e0e0e0' }}>not</strong> have to buy credits—you can still pay per match with a card when you report.
      </p>
      
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
          <li>{WHY_CREDITS_MATCH_REPORTING}</li>
          <li>No need to enter card details for each match</li>
          <li>Useful for tournament entry and other ladder payments</li>
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
        <h3 style={{ color: '#fff', margin: '0 0 0.35rem 0', fontSize: '1.2rem' }}>💡 Extras and fee summary</h3>
        <p style={{ color: '#bdbdbd', fontSize: isMobile ? '0.82rem' : '0.9rem', lineHeight: 1.45, margin: '0 0 1rem 0' }}>
          {OPTIONAL_TOOLS_REFERS_TO_REPORT}
        </p>
        
        {/* Ladder billing status */}
        <div style={{
          background: phaseColor,
          border: `1px solid ${phaseColor.replace('0.1', '0.3')}`,
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            {phaseIcon} {phaseDescription}
          </div>
          <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
            {currentPhase === 1 && 'Free ladder access; reporting fees when you post match results.'}
            {currentPhase === 2 && 'Free ladder access; reporting fees when you post match results.'}
            {currentPhase === 3 && 'Free ladder access; reporting fees and tournaments fund prize pools.'}
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
            📋 Quick billing summary
          </div>
          <div style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: '1.4' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#4caf50' }}>Playing the ladder:</strong> No monthly membership — join and play per league rules.
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#ff9800' }}>After a match:</strong> {MEMBERSHIP_TAB_POST_MATCH_LINE}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: '#9c27b0' }}>On this dashboard:</strong> Buy credits, optional legacy account tools if your phase still shows them, and your payment history.
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
                💰 Optional ladder account payment: ${membershipFee.toFixed(2)} USD
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
                {currentPhase === 2 && 'Trial launch — reporting fees apply when you submit match results'}
                {currentPhase === 3 && 'Full launch — reporting fees apply when you submit match results'}
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
              {loading ? 'Processing...' : `Complete purchase ($${membershipFee.toFixed(2)})`}
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
              🎉 Free ladder access
            </div>
            <div style={{ fontSize: '0.9rem', color: '#ccc' }}>
              There is no monthly ladder fee. Add credits here if you like, or pay each time from{' '}
              <strong>{REPORT_RESULTS_MENU_LABEL}</strong> when you post a result.
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div>
      <h3 style={{ color: '#fff', margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>📋 Receipts</h3>
      <p style={{ color: '#bdbdbd', fontSize: isMobile ? '0.82rem' : '0.9rem', lineHeight: 1.45, margin: '0 0 1rem 0' }}>
        Credit purchases, tournament entries, and other payments <strong style={{ color: '#cfd8dc' }}>recorded through this dashboard</strong> for your account. (Match reporting fees from {REPORT_RESULTS_MENU_LABEL} may not all appear here—use ladder history where needed.)
      </p>
      
      {accountData.paymentHistory.length === 0 ? (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          color: '#ccc'
        }}>
          No payments recorded yet. After you buy credits or complete a fee, entries will show up here.
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
                    {payment.type === 'membership' ? 'Legacy account' : 
                     payment.type === 'match_fee' ? 'Match fee' : 
                     'Credits'}
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
          height: isMobile ? "calc(100vh - 1rem)" : "calc(100vh - 160px)",
          maxHeight: isMobile ? "calc(100vh - 1rem)" : "calc(100vh - 160px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
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
            title="Refresh your balance and look for a recent card (Square) payment"
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

        {/* Modal Content - scrollable area */}
        <div style={{
          padding: isMobile ? '0.4rem 0.35rem' : '1rem',
          flex: '1 1 0',
          minHeight: 0,
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

        {!paymentContext?.type && !howItWorksHidden && (
          <div style={{
            background: 'rgba(76, 175, 80, 0.09)',
            border: '1px solid rgba(76, 175, 80, 0.45)',
            borderRadius: isMobile ? '8px' : '10px',
            padding: isMobile ? '0.55rem 0.65rem' : '0.75rem 1rem',
            marginBottom: isMobile ? '0.45rem' : '0.85rem',
            color: '#eceff1',
            fontSize: isMobile ? '0.78rem' : '0.86rem',
            lineHeight: 1.5,
            minWidth: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '0.35rem' }}>
              <strong style={{ color: '#fff', fontSize: isMobile ? '0.82rem' : '0.92rem' }}>How this screen works</strong>
              <button
                type="button"
                onClick={dismissHowItWorks}
                style={{
                  flexShrink: 0,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(0,0,0,0.2)',
                  color: '#e0e0e0',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Hide tip
              </button>
            </div>
            <ol style={{ margin: '0.25rem 0 0', paddingLeft: '1.15rem' }}>
              <li style={{ marginBottom: '0.35rem' }}>
                <strong>Match reporting fees</strong> (after you win) are paid in <strong>{REPORT_RESULTS_MENU_LABEL}</strong> on the ladder — <strong>not here</strong>. Close this window and use the ladder when you are posting a result.
              </li>
              <li style={{ marginBottom: '0.35rem' }}>
                <strong>Add money</strong> to your account → open the <strong>Add credits</strong> tab (tournaments and faster checkout).
              </li>
              <li style={{ marginBottom: '0.35rem' }}>
                <strong>Paid with a card</strong> (Square) and your balance did not update yet? Use <strong>Check for my payment</strong> at the <strong>bottom</strong> of this window after you pick a tab.
              </li>
              <li>
                If your league ever shows an <strong>optional account fee</strong>, an <strong>Extras</strong> tab appears for that payment only. Otherwise you only need <strong>Home</strong>, <strong>Add credits</strong>, and <strong>Receipts</strong>.
              </li>
            </ol>
          </div>
        )}
        {!paymentContext?.type && howItWorksHidden && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: isMobile ? '6px' : '8px',
            padding: isMobile ? '0.45rem 0.55rem' : '0.55rem 0.75rem',
            marginBottom: isMobile ? '0.4rem' : '0.75rem',
            color: '#b0bec5',
            fontSize: isMobile ? '0.74rem' : '0.82rem',
            lineHeight: 1.4,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <span>
              Match fees: <strong style={{ color: '#e2e8f0' }}>{REPORT_RESULTS_MENU_LABEL}</strong> on the ladder. Credits and receipts: tabs below.
            </span>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.removeItem('payment_dashboard_how_it_works_hidden');
                } catch (_) {}
                setHowItWorksHidden(false);
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(129, 140, 248, 0.45)',
                background: 'rgba(79, 70, 229, 0.2)',
                color: '#c7d2fe',
                fontSize: '0.72rem',
                cursor: 'pointer',
                fontWeight: 600,
                flexShrink: 0
              }}
            >
              Show tips again
            </button>
          </div>
        )}

        {paymentContext?.type === 'tournament_entry' && (
          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: isMobile ? '6px' : '12px',
            padding: isMobile ? '0.75rem' : '1.25rem',
            marginBottom: isMobile ? '0.6rem' : '1rem'
          }}>
            <h3 style={{ color: '#8b5cf6', margin: '0 0 0.5rem 0', fontSize: isMobile ? '1rem' : '1.2rem' }}>
              🏆 Tournament Entry Fee
            </h3>
            <div style={{ color: '#ccc', fontSize: isMobile ? '0.85rem' : '0.95rem', marginBottom: '0.75rem' }}>
              {paymentContext.tournamentName} • {paymentContext.ladderName}
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <span style={{ color: '#fff', fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 'bold' }}>
                ${(paymentContext.amount || 0).toFixed(2)}
              </span>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ color: '#ccc', display: 'block', marginBottom: '0.35rem', fontSize: isMobile ? '0.8rem' : '0.9rem' }}>Payment Method</label>
              <select
                value={tournamentEntryMethod}
                onChange={(e) => setTournamentEntryMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: isMobile ? '0.5rem' : '0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}
              >
                <option value="credits">💳 Pay with Credits (${(accountData.credits || 0).toFixed(2)} available)</option>
                <option value="cash">💵 Cash (Legends Red Dropbox - Pending Admin Approval)</option>
                {availablePaymentMethods.map(method => (
                  <option key={method.id} value={method.id}>{method.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handlePayTournamentEntry}
              disabled={tournamentEntryPaying}
              style={{
                width: '100%',
                background: tournamentEntryPaying ? 'rgba(139, 92, 246, 0.4)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: isMobile ? '0.6rem' : '0.9rem',
                fontSize: isMobile ? '0.95rem' : '1.05rem',
                fontWeight: 'bold',
                cursor: tournamentEntryPaying ? 'wait' : 'pointer'
              }}
            >
              {tournamentEntryPaying ? 'Processing...' : `Pay $${(paymentContext.amount || 0).toFixed(2)}`}
            </button>
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
            { id: 'overview', label: isMobile ? '📊 Home' : '📊 Home', icon: '📊' },
            { id: 'credits', label: isMobile ? '➕ Credits' : '💳 Add credits', icon: '💳' },
            ...(showExtrasTab ? [{ id: 'membership', label: isMobile ? '💡 Extras' : '💡 Optional account', icon: '🎯' }] : []),
            { id: 'history', label: isMobile ? '📋 Receipts' : '📋 Receipts', icon: '📋' }
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

        {/* Square / processor catch-up — below tabs so “where do I pay for a match?” is not the first thing */}
        <div style={{ marginTop: isMobile ? '0.5rem' : '0.75rem', marginBottom: isMobile ? '0.25rem' : '0.35rem', padding: isMobile ? '0.45rem 0.5rem' : '0.85rem 1rem', background: 'rgba(33, 150, 243, 0.12)', borderRadius: isMobile ? '6px' : '8px', border: '1px solid rgba(33, 150, 243, 0.45)', minWidth: 0 }}>
          <div style={{ color: '#90caf9', fontWeight: 'bold', marginBottom: isMobile ? '0.2rem' : '0.3rem', fontSize: isMobile ? '0.78rem' : '0.95rem' }}>Paid with a card and your balance did not update?</div>
          <div style={{ color: '#b0bec5', fontSize: isMobile ? '0.7rem' : '0.8rem', marginBottom: isMobile ? '0.35rem' : '0.45rem', lineHeight: 1.4 }}>
            Use this after you return from Square (for example after buying credits). It rechecks your account when the processor is a little behind.
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={checkPaymentLoading}
            style={{
              width: '100%',
              padding: isMobile ? '0.45rem 0.6rem' : '0.65rem 1rem',
              background: checkPaymentLoading ? 'rgba(255,255,255,0.1)' : 'rgba(33, 150, 243, 0.42)',
              color: '#fff',
              border: '1px solid rgba(33, 150, 243, 0.75)',
              borderRadius: isMobile ? '6px' : '8px',
              cursor: checkPaymentLoading ? 'wait' : 'pointer',
              fontSize: isMobile ? '0.82rem' : '0.95rem',
              fontWeight: 'bold'
            }}
          >
            {checkPaymentLoading ? 'Checking…' : 'Check for my payment'}
          </button>
        </div>
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
              🛡️ How payment approval works
            </h2>

            <div style={{ color: '#ccc', lineHeight: isMobile ? '1.45' : '1.6' }}>
              <p style={{
                marginBottom: isMobile ? '0.6rem' : '1.2rem',
                fontSize: isMobile ? '0.88rem' : '1.1rem',
                textAlign: 'center'
              }}>
                For <strong>cash</strong> or <strong>manual app payments</strong>, staff may need to confirm the money arrived before the app marks you paid.
                <strong> Card</strong> (Square) and <strong>credits</strong> usually update right away once the processor or balance check succeeds.
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
