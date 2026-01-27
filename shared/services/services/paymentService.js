import { BACKEND_URL } from '@shared/config/config.js';

// Payment Service - Handles all payment-related API calls
class PaymentService {
  constructor() {
    this.baseURL = `${BACKEND_URL}/api/payments`;
  }

  // Get player payments
  async getPlayerPayments(playerId, session) {
    try {
      const response = await fetch(`${this.baseURL}/player/${playerId}/${session}`);
      if (!response.ok) throw new Error('Failed to fetch player payments');
      return await response.json();
    } catch (error) {
      console.error('Error fetching player payments:', error);
      throw error;
    }
  }

  // Get division payments
  async getDivisionPayments(division, session) {
    try {
      const response = await fetch(`${this.baseURL}/division/${encodeURIComponent(division)}/${session}`);
      if (!response.ok) throw new Error('Failed to fetch division payments');
      return await response.json();
    } catch (error) {
      console.error('Error fetching division payments:', error);
      throw error;
    }
  }

  // Get payment statistics
  async getPaymentStats(division, session) {
    try {
      const response = await fetch(`${this.baseURL}/stats/${encodeURIComponent(division)}/${session}`);
      if (!response.ok) throw new Error('Failed to fetch payment stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      throw error;
    }
  }

  // Check match eligibility
  async checkMatchEligibility(playerId, session) {
    try {
      const response = await fetch(`${this.baseURL}/eligibility/${playerId}/${session}`);
      if (!response.ok) throw new Error('Failed to check match eligibility');
      return await response.json();
    } catch (error) {
      console.error('Error checking match eligibility:', error);
      throw error;
    }
  }

  // Record a payment
  async recordPayment(paymentData) {
    try {
      console.log('Payment service - recording payment:', paymentData);
      console.log('Payment service - URL:', `${this.baseURL}/record`);
      
      const response = await fetch(`${this.baseURL}/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });
      
      console.log('Payment service - response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment service - error response:', errorData);
        throw new Error(errorData.error || 'Failed to record payment');
      }
      
      const result = await response.json();
      console.log('Payment service - success result:', result);
      return result;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  // Record weekly dues for all players
  async recordWeeklyDues(division, session, weekNumber) {
    try {
      const response = await fetch(`${this.baseURL}/weekly-dues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ division, session, weekNumber })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record weekly dues');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error recording weekly dues:', error);
      throw error;
    }
  }

  // Apply late fees
  async applyLateFees(division, session) {
    try {
      const response = await fetch(`${this.baseURL}/apply-late-fees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ division, session })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply late fees');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error applying late fees:', error);
      throw error;
    }
  }

  // Update payment status
  async updatePaymentStatus(paymentId, statusData) {
    try {
      const response = await fetch(`${this.baseURL}/${paymentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statusData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update payment status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  // Delete payment (admin only)
  async deletePayment(paymentId) {
    try {
      const response = await fetch(`${this.baseURL}/${paymentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete payment');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }

  // Helper method to format payment amount
  formatAmount(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Helper method to get payment type display name
  getPaymentTypeDisplayName(paymentType) {
    const typeNames = {
      'registration_fee': 'Registration Fee',
      'weekly_dues': 'Weekly Dues',
      'participation_fee': 'Participation Fee',
      'pre_payment': 'Pre-Payment',
      'late_payment_fee': 'Late Payment Fee',
      'no_show_fee': 'No-Show Fee',
      'late_cancellation_fee': 'Late Cancellation Fee',
      'reschedule_fee': 'Reschedule Fee',
      'penalty_fee': 'Penalty Fee',
      'refund': 'Refund'
    };
    return typeNames[paymentType] || paymentType;
  }

  // Helper method to get payment method display name
  getPaymentMethodDisplayName(paymentMethod) {
    const methodNames = {
      'cash': 'Cash',
      'venmo': 'Venmo',
      'cashapp': 'Cash App',
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'check': 'Check',
      'online': 'Online'
    };
    return methodNames[paymentMethod] || paymentMethod;
  }

  // Helper method to get status display name
  getStatusDisplayName(status) {
    const statusNames = {
      'pending': 'Pending',
      'paid': 'Paid',
      'overdue': 'Overdue',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded'
    };
    return statusNames[status] || status;
  }

  // Helper method to check if payment is overdue
  isPaymentOverdue(dueDate) {
    return new Date() > new Date(dueDate);
  }

  // Helper method to calculate days overdue
  getDaysOverdue(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = now - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  // Helper method to get payment status color
  getStatusColor(status) {
    const colors = {
      'pending': '#f39c12', // Orange
      'paid': '#27ae60',    // Green
      'overdue': '#e74c3c', // Red
      'cancelled': '#95a5a6', // Gray
      'refunded': '#3498db'  // Blue
    };
    return colors[status] || '#95a5a6';
  }
}

export default new PaymentService();
