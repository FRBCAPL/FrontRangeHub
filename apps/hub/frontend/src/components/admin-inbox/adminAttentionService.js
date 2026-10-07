import { supabase } from '@shared/config/supabase.js';

export const ADMIN_INBOX_PATH = '/admin/inbox';
export const ATTENTION_MISSING = 'Run supabase-migrations/admin-attention-summary-2026-10.sql in the Supabase SQL editor, then refresh.';

/** { key: count } for everything waiting on the admin. Throws ATTENTION_MISSING if the SQL hasn't been run. */
export async function loadAttentionSummary() {
  const { data, error } = await supabase.rpc('admin_attention_summary');
  if (error) {
    if (/could not find the function|schema cache/i.test(error.message || '')) throw new Error(ATTENTION_MISSING);
    throw new Error(error.message || 'Could not load the admin inbox.');
  }
  return data || {};
}
