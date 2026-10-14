import { supabase } from '@shared/config/supabase.js';

/** Outbid / ending-soon emails. On unless the user turned them off. Null when the alerts SQL hasn't run. */
export async function loadBiddingEmails(userId) {
  const { data, error } = await supabase
    .from('consignment_alert_prefs')
    .select('bidding_emails')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data ? data.bidding_emails : true;
}

export async function saveBiddingEmails(userId, on) {
  const { error } = await supabase
    .from('consignment_alert_prefs')
    .upsert({ user_id: userId, bidding_emails: on, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message || 'Could not save your email setting.');
}
