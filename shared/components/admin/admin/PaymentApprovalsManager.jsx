import React, { useState, useEffect } from 'react';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const PaymentApprovalsManager = ({ userToken, selectedLadder = '499-under' }) => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState('all');
  const [playerNames, setPlayerNames] = useState({}); // email -> "FirstName LastName"

  const loadPlayerNames = async (payments) => {
    const emails = [...new Set((payments || []).map(p => p.playerEmail).filter(Boolean))];
    const map = {};
    await Promise.all(emails.map(async (email) => {
      try {
        const result = await supabaseDataService.getUserByEmail(email);
        if (result?.success && result?.data) {
          const u = result.data;
          const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
          if (name) map[email] = name;
        }
      } catch (_) {}
    }));
    setPlayerNames(map);
  };

  const loadPendingPayments = async () => {
    setPaymentLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/pending-payments?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        const payments = data.pendingPayments || [];
        setPendingPayments(payments);
        await loadPlayerNames(payments);
      }
    } catch (err) {
      console.error('Error loading pending payments:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    loadPendingPayments();
  }, []);

  const handleApprovePayment = async (paymentId, approved) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/verify-payment/${paymentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified: approved,
          adminNotes: approved ? 'Approved by ladder admin' : 'Rejected by ladder admin'
        })
      });
      if (response.ok) {
        await loadPendingPayments();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(`Failed: ${data.message || 'Could not update payment'}`);
      }
    } catch (err) {
      console.error('Error approving payment:', err);
      alert('Error updating payment');
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!window.confirm('This will remove duplicate membership payments for the same player, keeping only the latest one. Continue?')) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/monetization/cleanup-duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        await loadPendingPayments();
      } else {
        alert('❌ Failed to cleanup duplicates');
      }
    } catch (err) {
      console.error('Error cleaning up duplicates:', err);
      alert('❌ Error cleaning up duplicates');
    }
  };

  const filteredPayments = pendingPayments.filter(payment => {
    if (selectedPaymentType !== 'all' && payment.type !== selectedPaymentType) return false;
    if (payment.type === 'match_reporting' && payment.ladderName !== selectedLadder) return false;
    return true;
  });

  const summary = pendingPayments.reduce((acc, payment) => {
    if (selectedPaymentType !== 'all' && payment.type !== selectedPaymentType) return acc;
    if (payment.type === 'match_reporting' && payment.ladderName !== selectedLadder) return acc;
    if (['credits_purchase', 'membership', 'sanction'].includes(payment.type)) {
      acc[payment.type] = (acc[payment.type] || 0) + 1;
    } else if (payment.type === 'match_reporting') {
      acc['match_reporting'] = (acc['match_reporting'] || 0) + 1;
    }
    return acc;
  }, {});

  const totalCount = Object.values(summary).reduce((sum, c) => sum + c, 0);
  const typeConfig = {
    credits_purchase: { label: 'Credits Purchase', color: '#10b981', icon: '💰' },
    membership: { label: 'Membership', color: '#3b82f6', icon: '👤' },
    match_reporting: { label: 'Match Reporting', color: '#f59e0b', icon: '🏆' },
    sanction: { label: 'Sanction', color: '#8b5cf6', icon: '📋' }
  };

  const groupedPayments = filteredPayments.reduce((groups, payment) => {
    const type = payment.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(payment);
    return groups;
  }, {});

  return (
    <div style={{
      padding: '20px',
      background: 'rgba(20, 20, 30, 0.95)',
      borderRadius: '12px',
      color: '#e0e0e0',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <h3 style={{ color: '#fff', margin: '0 0 20px 0' }}>💰 Payment Approvals</h3>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ color: '#fff', marginRight: '10px', fontSize: '14px' }}>Filter by Payment Type:</label>
        <select
          value={selectedPaymentType}
          onChange={(e) => setSelectedPaymentType(e.target.value)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '14px',
            minWidth: '200px'
          }}
        >
          <option value="all">All Payment Types</option>
          <option value="credits_purchase">💰 Credits Purchase</option>
          <option value="membership">👤 Membership</option>
          <option value="match_reporting">🏆 Match Reporting</option>
          <option value="sanction">📋 Sanction</option>
        </select>
      </div>

      {totalCount > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '10px' }}>
            📊 Payment Summary ({totalCount} total)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            {Object.entries(summary).map(([type, count]) => {
              const config = typeConfig[type];
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: config?.color || '#fff', fontSize: '14px' }}>
                  {config?.icon} {config?.label}: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={loadPendingPayments} style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer'
        }}>
          🔄 Refresh Pending Payments
        </button>
        <button onClick={handleCleanupDuplicates} style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer'
        }}>
          🧹 Cleanup Duplicates
        </button>
      </div>

      {paymentLoading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#fff' }}>Loading pending payments...</div>
      ) : filteredPayments.length === 0 ? (
        <div style={{ padding: '20px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px', color: '#4caf50', textAlign: 'center' }}>
          ✅ No pending payments requiring approval
          {selectedPaymentType !== 'all' && ` for ${selectedPaymentType.replace('_', ' ')}`}
          {selectedPaymentType === 'match_reporting' && ` in ${selectedLadder}`}
        </div>
      ) : (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {Object.entries(groupedPayments).map(([type, payments]) => (
            <div key={type} style={{ marginBottom: '20px' }}>
              <div style={{
                background: `linear-gradient(135deg, ${typeConfig[type]?.color || '#6b7280'}20, ${typeConfig[type]?.color || '#6b7280'}10)`,
                border: `1px solid ${typeConfig[type]?.color || '#6b7280'}40`,
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '10px'
              }}>
                <h4 style={{ color: typeConfig[type]?.color || '#fff', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {typeConfig[type]?.icon || '📄'} {typeConfig[type]?.label || type.replace('_', ' ').toUpperCase()} ({payments.length})
                </h4>
              </div>
              {payments.map((payment) => (
                <div key={payment._id} style={{
                  padding: '15px',
                  marginBottom: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: `1px solid ${(typeConfig[type]?.color || '#6b7280')}40`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                      <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>
                        ${payment.amount} - {typeConfig[type]?.label || payment.type.replace('_', ' ').toUpperCase()}
                      </div>
                      <div style={{ color: '#ccc', fontSize: '14px' }}>
                        Player: {playerNames[payment.playerEmail] || payment.playerName || payment.player_name || payment.playerEmail}
                        {playerNames[payment.playerEmail] && payment.playerEmail && (
                          <span style={{ color: '#888', marginLeft: '6px' }}>({payment.playerEmail})</span>
                        )}
                      </div>
                      <div style={{ color: '#ccc', fontSize: '14px' }}>
                        Method: {payment.paymentMethod} • Date: {new Date(payment.createdAt).toLocaleDateString()}
                      </div>
                      {payment.ladderName && <div style={{ color: '#ccc', fontSize: '14px' }}>Ladder: {payment.ladderName}</div>}
                      {payment.description && <div style={{ color: '#ccc', fontSize: '14px' }}>Description: {payment.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleApprovePayment(payment._id, true)} style={{
                        background: '#4CAF50', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
                      }}>✅ Approve</button>
                      <button onClick={() => handleApprovePayment(payment._id, false)} style={{
                        background: '#f44336', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
                      }}>❌ Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentApprovalsManager;
