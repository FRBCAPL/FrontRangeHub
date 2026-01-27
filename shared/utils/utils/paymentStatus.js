import { BACKEND_URL } from '@shared/config/config.js';

/**
 * Check if a user's payment is current for ladder access
 * @param {string} email - User's email address
 * @returns {Promise<{isCurrent: boolean, message: string}>}
 */
export const checkPaymentStatus = async (email) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/monetization/payment-status/${email}`);
    
    if (!response.ok) {
      throw new Error('Failed to check payment status');
    }
    
    const data = await response.json();
    
    return {
      isCurrent: data.isCurrent || false,
      message: data.message || 'Payment status unknown',
      lastPayment: data.lastPayment,
      nextDue: data.nextDue
    };
  } catch (error) {
    console.error('Error checking payment status:', error);
    return {
      isCurrent: false,
      message: 'Unable to verify payment status. Please contact support.',
      lastPayment: null,
      nextDue: null
    };
  }
};

/**
 * Show payment required modal for ladder challenges
 * @param {Function} onPayNow - Callback when user wants to pay
 * @param {Function} onCancel - Callback when user cancels
 */
export const showPaymentRequiredModal = (onPayNow, onCancel) => {
  // This would typically show a modal component
  // For now, we'll use a simple confirm dialog
  const userWantsToPay = confirm(
    `💳 Membership Required\n\n` +
    `To participate in ladder challenges and match reporting, you need a current $5/month membership.\n\n` +
    `Would you like to purchase a membership now?`
  );
  
  if (userWantsToPay) {
    onPayNow();
  } else {
    onCancel();
  }
};

/**
 * Check if user can perform ladder actions (challenge/defend)
 * @param {string} email - User's email
 * @param {Function} onPaymentRequired - Callback when payment is required
 * @returns {Promise<boolean>} - true if user can perform action
 */
export const canPerformLadderAction = async (email, onPaymentRequired) => {
  const paymentStatus = await checkPaymentStatus(email);
  
  if (!paymentStatus.isCurrent) {
    onPaymentRequired();
    return false;
  }
  
  return true;
};
