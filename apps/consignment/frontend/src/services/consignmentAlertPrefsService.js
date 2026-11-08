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

/** "Email me when new items are listed". Off unless turned on. Null when the new-listing SQL hasn't run. */
export async function loadNewListingEmails(userId) {
  const { data, error } = await supabase
    .from('consignment_alert_prefs')
    .select('new_listing_emails')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return Boolean(data?.new_listing_emails);
}

/** Turning it on restarts the clock, so the first email only covers items listed from now on. */
export async function saveNewListingEmails(userId, on) {
  const now = new Date().toISOString();
  const row = { user_id: userId, new_listing_emails: on, updated_at: now };
  if (on) row.new_listing_sent_at = now;
  const { error } = await supabase.from('consignment_alert_prefs').upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error(error.message || 'Could not save your email setting.');
}
