import { supabase } from '@shared/config/supabase.js';

const MISSING = 'Run supabase-migrations/hub-account-approval-2026-10.sql in the Supabase SQL editor, then try again.';

/** Approve or decline a pending hub account (admin only; runs server-side because users RLS is own-row only). */
export async function setAccountApproval(userId, approve) {
  const { error } = await supabase.rpc('admin_set_account_approval', {
    p_user_id: userId,
    p_approve: Boolean(approve),
  });
  if (error) {
    if (/could not find the function|schema cache/i.test(error.message || '')) throw new Error(MISSING);
    throw new Error(error.message || 'Could not update the account.');
  }
}
