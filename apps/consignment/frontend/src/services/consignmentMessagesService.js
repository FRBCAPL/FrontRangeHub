import { supabase } from '@shared/config/supabase.js';

const MISSING = 'Messages aren’t set up yet. Run supabase-migrations/consignment-messages-2026-10.sql in the Supabase SQL editor, then refresh.';

function fail(error, fallback) {
  const msg = error?.message || '';
  if (/consignment_messages|send_consignment_message|schema cache|does not exist|could not find/i.test(msg)) throw new Error(MISSING);
  throw new Error(msg || fallback);
}

export async function sendConsignmentMessage({ name, email, phone, topic, itemNumber, message }) {
  const { data, error } = await supabase.rpc('send_consignment_message', {
    p_name: name,
    p_email: email || null,
    p_phone: phone || null,
    p_topic: topic,
    p_item_number: itemNumber || null,
    p_message: message,
  });
  if (error) fail(error, 'Could not send your message.');
  return data;
}

/** Admin: messages newest first; status 'open' = new + answered. */
export async function loadConsignmentMessages(status = 'new') {
  let query = supabase.from('consignment_messages').select('*').order('created_at', { ascending: false }).limit(200);
  if (status === 'open') query = query.in('status', ['new', 'answered']);
  else if (status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) fail(error, 'Could not load messages.');
  return data || [];
}

export async function setConsignmentMessageStatus(id, status, adminNote) {
  const patch = { status, handled_at: status === 'new' ? null : new Date().toISOString() };
  if (adminNote !== undefined) patch.admin_note = adminNote || null;
  const { error } = await supabase.from('consignment_messages').update(patch).eq('id', id);
  if (error) fail(error, 'Could not update the message.');
}
