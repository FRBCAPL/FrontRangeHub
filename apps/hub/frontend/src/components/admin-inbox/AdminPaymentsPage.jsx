import React from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentTracking from '@apps/singles-league/frontend/src/components/dashboard/PaymentTracking.jsx';
import { ADMIN_INBOX_PATH } from './adminAttentionService.js';

/** Pending payments (the same list Admin Home counts) on their own page; closing returns to Admin Home. */
export default function AdminPaymentsPage() {
  const navigate = useNavigate();
  return <PaymentTracking onClose={() => navigate(ADMIN_INBOX_PATH)} />;
}
