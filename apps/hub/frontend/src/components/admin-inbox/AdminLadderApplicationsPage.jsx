import React from 'react';
import { useNavigate } from 'react-router-dom';
import LadderApplicationsManager from '@shared/components/admin/admin/LadderApplicationsManager.jsx';
import { ADMIN_INBOX_PATH } from './adminAttentionService.js';

/** Ladder sign-up approvals on their own page; closing returns to Admin Home. */
export default function AdminLadderApplicationsPage({ userToken }) {
  const navigate = useNavigate();
  return <LadderApplicationsManager userToken={userToken} onClose={() => navigate(ADMIN_INBOX_PATH)} />;
}
