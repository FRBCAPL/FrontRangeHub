import React, { useState, useEffect } from 'react';
import supabaseDataService from '../../services/supabaseDataService.js';
import DraggableModal from '../modal/DraggableModal.jsx';

const PaymentTracking = ({ onClose }) => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    matchFees: 0,
    memberships: 0,
    creditsPurchases: 0
  });

  useEffect(() => {
    loadPendingPayments();
  }, []);

  const loadPendingPayments = async () => {
    try {
      setLoading(true);
      const result = await supabaseDataService.getPendingPayments();
      
      if (result.success) {
        setPendingPayments(result.pendingPayments || []);
        setStats(result.stats || {
          total: 0,
          matchFees: 0,
          memberships: 0,
          creditsPurchases: 0,
          weeklyDues: 0
        });
      } else {
        setError(result.error || 'Failed to load pending payments');
      }
    } catch (error) {
      console.error('Error loading pending payments:', error);
      setError('Network error loading payments');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (verified) => {
    if (!selectedPayment) return;

    try {
      const result = await supabaseDataService.verifyPayment(
        selectedPayment.id,
        verified,
        adminNotes
      );

      if (result.success) {
        // Reload pending payments
        await loadPendingPayments();
        setShowVerifyModal(false);
        setSelectedPayment(null);
        setAdminNotes('');
      } else {
        setError(result.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError('Network error verifying payment');
    }
  };

  const openVerifyModal = (payment) => {
    setSelectedPayment(payment);
    setShowVerifyModal(true);
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

  if (loading) {
    return (
      <DraggableModal
        open={true}
        onClose={onClose}
        title="Payment Tracking"
        maxWidth="1000px"
      >
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="loading-spinner">Loading pending payments...</div>
        </div>
      </DraggableModal>
    );
  }

  return (
    <>
      <DraggableModal
        open={true}
        onClose={onClose}
        title="Payment Tracking & Verification"
        maxWidth="1200px"
      >
        <div style={{ padding: '1rem 0' }}>
          {error && (
            <div style={{
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '1rem',
              color: '#ffc107'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Pending Payments List */}
          <div>
            <h3 style={{ color: '#fff', marginBottom: '1rem' }}>
              🔍 Pending Payment Verifications ({stats.total})
            </h3>
            
            {pendingPayments.length === 0 ? (
              <div style={{ 
                padding: '2rem', 
                background: 'rgba(76, 175, 80, 0.1)', 
                borderRadius: '8px',
                color: '#4caf50',
                textAlign: 'center'
              }}>
                ✅ No pending payments requiring verification
              </div>
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {pendingPayments.map((payment, index) => (
                  <div key={payment._id} style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <strong style={{ color: '#fff' }}>{payment.playerEmail}</strong>
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
                    
                    <div style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      <div><strong>Method:</strong> {payment.paymentMethodDisplay || payment.paymentMethod}</div>
                      <div><strong>Description:</strong> {payment.description}</div>
                      <div><strong>Submitted:</strong> {formatDate(payment.createdAt)}</div>
                      {payment.notes && <div><strong>Notes:</strong> {payment.notes}</div>}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openVerifyModal(payment)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        ✅ Verify Payment
                      </button>
                      <button
                        onClick={() => window.open(`mailto:${payment.playerEmail}?subject=Payment Verification Needed&body=Hi, we need to verify your payment for ${payment.description}. Please provide transaction details.`, '_blank')}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'transparent',
                          color: '#ccc',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        📧 Contact
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '8px' 
          }}>
            <h4 style={{ color: '#fff', marginBottom: '0.5rem' }}>📊 Payment Verification Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', color: '#ccc', fontSize: '0.9rem' }}>
              <div>
                <strong>Total Pending:</strong> {stats.total}
              </div>
              <div>
                <strong>Memberships:</strong> {stats.memberships}
              </div>
              <div>
                <strong>Match Fees:</strong> {stats.matchFees}
              </div>
              <div>
                <strong>Credits:</strong> {stats.creditsPurchases}
              </div>
            </div>
          </div>
        </div>
      </DraggableModal>

      {/* Payment Verification Modal */}
      {showVerifyModal && selectedPayment && (
        <DraggableModal
          open={showVerifyModal}
          onClose={() => setShowVerifyModal(false)}
          title={`Verify Payment - ${selectedPayment.type === 'membership' ? 'Membership' : selectedPayment.type === 'match_fee' ? 'Match Fee' : 'Credits Purchase'}`}
          maxWidth="500px"
        >
          <div style={{ padding: '1rem 0' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: '#fff' }}>{selectedPayment.playerEmail}</strong>
              <div style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                <div><strong>Amount:</strong> ${selectedPayment.amount.toFixed(2)}</div>
                <div><strong>Method:</strong> {selectedPayment.paymentMethodDisplay || selectedPayment.paymentMethod}</div>
                <div><strong>Description:</strong> {selectedPayment.description}</div>
              </div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: '#ccc', display: 'block', marginBottom: '0.5rem' }}>
                Admin Notes (Optional):
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about payment verification..."
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '1rem',
                  minHeight: '80px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => handleVerifyPayment(true)}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                ✅ Verify Payment
              </button>
              <button
                onClick={() => handleVerifyPayment(false)}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  background: 'linear-gradient(45deg, #f44336, #d32f2f)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                ❌ Reject Payment
              </button>
            </div>
          </div>
        </DraggableModal>
      )}
    </>
  );
};

export default PaymentTracking;
