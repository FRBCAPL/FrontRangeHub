import React, { useState, useEffect } from 'react';
import paymentService from '@shared/services/services/paymentService.js';
import styles from './PaymentManagement.module.css';

const PaymentManagement = ({ division, session }) => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [players, setPlayers] = useState([]);

  // Form state for recording payment
  const [paymentForm, setPaymentForm] = useState({
    playerId: '',
    playerName: '',
    amount: '',
    paymentType: 'weekly_dues',
    paymentMethod: 'cash',
    weekNumber: '',
    referenceNumber: '',
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (division && session) {
      loadPaymentData();
      loadPlayers();
    }
  }, [division, session]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      const response = await paymentService.getDivisionPayments(division, session);
      setPayments(response.payments || []);
      setSummary(response.summary || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/api/users`);
      const users = await response.json();
      const divisionPlayers = users.filter(user => 
        user.divisions && user.divisions.includes(division)
      );
      setPlayers(divisionPlayers);
    } catch (err) {
      console.error('Error loading players:', err);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Recording payment:', paymentForm); // Debug log
      
      const paymentData = {
        ...paymentForm,
        division,
        session,
        dueDate: new Date().toISOString()
      };

      console.log('Payment data to send:', paymentData); // Debug log

      const result = await paymentService.recordPayment(paymentData);
      console.log('Payment result:', result); // Debug log
      
      // Reset form and reload data
      setPaymentForm({
        playerId: '',
        playerName: '',
        amount: '',
        paymentType: 'weekly_dues',
        paymentMethod: 'cash',
        weekNumber: '',
        referenceNumber: '',
        location: '',
        notes: ''
      });
      setShowRecordPayment(false);
      loadPaymentData();
      
      alert('Payment recorded successfully!');
    } catch (err) {
      console.error('Payment recording error:', err); // Debug log
      alert(`Error recording payment: ${err.message}`);
    }
  };

  const handleRecordWeeklyDues = async () => {
    const weekNumber = prompt('Enter week number (1-10):');
    if (!weekNumber || weekNumber < 1 || weekNumber > 10) {
      alert('Invalid week number');
      return;
    }

    try {
      await paymentService.recordWeeklyDues(division, session, parseInt(weekNumber));
      loadPaymentData();
      alert('Weekly dues recorded successfully!');
    } catch (err) {
      alert(`Error recording weekly dues: ${err.message}`);
    }
  };

  const handleApplyLateFees = async () => {
    if (!confirm('Apply late fees to all overdue payments?')) return;

    try {
      await paymentService.applyLateFees(division, session);
      loadPaymentData();
      alert('Late fees applied successfully!');
    } catch (err) {
      alert(`Error applying late fees: ${err.message}`);
    }
  };

  const handlePlayerSelect = (playerId) => {
    const player = players.find(p => p._id === playerId);
    setSelectedPlayer(player);
    setPaymentForm(prev => ({
      ...prev,
      playerId,
      playerName: player ? `${player.firstName} ${player.lastName}` : ''
    }));
  };

  const handlePaymentTypeChange = (paymentType) => {
    setPaymentForm(prev => ({
      ...prev,
      paymentType,
      amount: getDefaultAmount(paymentType)
    }));
  };

  const getDefaultAmount = (paymentType) => {
    const amounts = {
      'registration_fee': 30,
      'weekly_dues': 10,
      'participation_fee': 100,
      'late_payment_fee': 5,
      'no_show_fee': 10,
      'late_cancellation_fee': 10,
      'reschedule_fee': 10
    };
    return amounts[paymentType] || '';
  };

  if (loading) {
    return <div className={styles['payment-loading']}>Loading payment data...</div>;
  }

  if (error) {
    return <div className={styles['payment-error']}>Error: {error}</div>;
  }

  return (
    <div className={styles['payment-management']}>
      <div className={styles['payment-header']}>
        <h2>Payment Management</h2>
        <div className={styles['payment-actions']}>
          <button 
            className={`${styles.btn} ${styles['btn-primary']}`}
            onClick={() => setShowRecordPayment(true)}
          >
            Record Payment
          </button>
          <button 
            className={`${styles.btn} ${styles['btn-secondary']}`}
            onClick={handleRecordWeeklyDues}
          >
            Record Weekly Dues
          </button>
          <button 
            className={`${styles.btn} ${styles['btn-warning']}`}
            onClick={handleApplyLateFees}
          >
            Apply Late Fees
          </button>
        </div>
      </div>

      {/* Payment Summary */}
      {summary && (
        <div className={styles['payment-summary']}>
          <h3>Payment Summary</h3>
          <div className={styles['summary-grid']}>
            <div className={styles['summary-item']}>
              <span className={styles.label}>Total Players:</span>
              <span className={styles.value}>{summary.totalPlayers}</span>
            </div>
            <div className={styles['summary-item']}>
              <span className={styles.label}>In Good Standing:</span>
              <span className={`${styles.value} ${styles.good}`}>{summary.playersInGoodStanding}</span>
            </div>
            <div className={styles['summary-item']}>
              <span className={styles.label}>Overdue:</span>
              <span className={`${styles.value} ${styles.overdue}`}>{summary.playersOverdue}</span>
            </div>
            <div className={styles['summary-item']}>
              <span className={styles.label}>Total Collected:</span>
              <span className={styles.value}>{paymentService.formatAmount(summary.totalCollected)}</span>
            </div>
            <div className={styles['summary-item']}>
              <span className={styles.label}>Total Owed:</span>
              <span className={styles.value}>{paymentService.formatAmount(summary.totalOwed)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <div className={styles['modal-overlay']}>
          <div className={styles['modal-content']}>
            <div className={styles['modal-header']}>
              <h3>Record Payment</h3>
              <button 
                className={styles['close-btn']}
                onClick={() => setShowRecordPayment(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment} className={styles['payment-form']}>
              <div className={styles['form-group']}>
                <label>Player:</label>
                <select
                  value={paymentForm.playerId}
                  onChange={(e) => handlePlayerSelect(e.target.value)}
                  required
                >
                  <option value="">Select Player</option>
                  {players.map(player => (
                    <option key={player._id} value={player._id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles['form-group']}>
                <label>Payment Type:</label>
                <select
                  value={paymentForm.paymentType}
                  onChange={(e) => handlePaymentTypeChange(e.target.value)}
                  required
                >
                  <option value="registration_fee">Registration Fee ($30)</option>
                  <option value="weekly_dues">Weekly Dues ($10)</option>
                  <option value="participation_fee">Participation Fee ($100)</option>
                  <option value="pre_payment">Pre-Payment</option>
                  <option value="late_payment_fee">Late Payment Fee ($5)</option>
                  <option value="no_show_fee">No-Show Fee ($10)</option>
                  <option value="late_cancellation_fee">Late Cancellation Fee ($10)</option>
                  <option value="reschedule_fee">Reschedule Fee ($10)</option>
                  <option value="penalty_fee">Penalty Fee</option>
                  <option value="refund">Refund</option>
                </select>
              </div>

              <div className={styles['form-group']}>
                <label>Amount:</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>

              {paymentForm.paymentType === 'weekly_dues' && (
                <div className={styles['form-group']}>
                  <label>Week Number:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={paymentForm.weekNumber}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, weekNumber: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className={styles['form-group']}>
                <label>Payment Method:</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="venmo">Venmo</option>
                  <option value="cashapp">Cash App</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="check">Check</option>
                  <option value="online">Online</option>
                </select>
              </div>

              <div className={styles['form-group']}>
                <label>Reference Number:</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                />
              </div>

              <div className={styles['form-group']}>
                <label>Location:</label>
                <input
                  type="text"
                  value={paymentForm.location}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div className={styles['form-group']}>
                <label>Notes:</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className={styles['form-actions']}>
                <button type="submit" className={`${styles.btn} ${styles['btn-primary']}`}>
                  Record Payment
                </button>
                <button 
                  type="button" 
                  className={`${styles.btn} ${styles['btn-secondary']}`}
                  onClick={() => setShowRecordPayment(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments List */}
      <div className={styles['payments-list']}>
        <h3>Recent Payments</h3>
        <div className={styles['payments-table']}>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 20).map(payment => (
                <tr key={payment._id} className={payment.status}>
                  <td>{payment.playerName}</td>
                  <td>{paymentService.getPaymentTypeDisplayName(payment.paymentType)}</td>
                  <td>{paymentService.formatAmount(payment.amount)}</td>
                  <td>{paymentService.getPaymentMethodDisplayName(payment.paymentMethod)}</td>
                  <td>
                    <span 
                      className={styles['status-badge']}
                      style={{ backgroundColor: paymentService.getStatusColor(payment.status) }}
                    >
                      {paymentService.getStatusDisplayName(payment.status)}
                    </span>
                  </td>
                  <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className={`${styles.btn} ${styles['btn-sm']} ${styles['btn-secondary']}`}
                      onClick={() => {
                        // Handle edit payment
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentManagement;
