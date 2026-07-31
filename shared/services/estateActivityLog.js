/**
 * Estate Vault activity / usage log (logins + key actions).
 * Fire-and-forget from call sites — never block the user flow.
 */
import { supabase } from '../config/supabase.js';
import { normalizeEstateCaseNumber } from '../utils/estateInventoryConstants.js';

function fail(error) {
  const raw = typeof error === 'string' ? error : error?.message || 'Something went wrong.';
  return { success: false, error: raw };
}

function ok(data) {
  return { success: true, data };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only these keys survive; everything else is dropped by the RPC anyway. */
const METADATA_KEYS = [
  'item_id',
  'scene_id',
  'amount',
  'court_case_number',
  'field',
  'old_value',
  'new_value',
  'note',
  'topic',
  'related_id',
  'distribution_id',
  'recipient_id',
  'status'
];

function safeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return {};
  const out = {};
  METADATA_KEYS.forEach((key) => {
    const value = metadata[key];
    if (value !== undefined && value !== null && typeof value !== 'object') {
      out[key] = value;
    }
  });
  return out;
}

/**
 * The actor (role, name, email) is resolved server-side from the session token
 * or the signed-in user. Anything the client claims about identity is ignored.
 *
 * @param {{
 *   eventType: string,
 *   caseNumber?: string|null,
 *   sessionToken?: string|null,
 *   metadata?: Record<string, unknown>
 * }} input
 */
export async function writeEstateActivity(input = {}) {
  const eventType = String(input.eventType || '')
    .trim()
    .toLowerCase();
  if (!eventType) return fail('eventType required');

  const token = String(input.sessionToken || '').trim();

  try {
    const { data, error } = await supabase.rpc('estate_log_activity', {
      p_event_type: eventType,
      p_case_number: normalizeEstateCaseNumber(input.caseNumber) || null,
      p_session_token: UUID_RE.test(token) ? token : null,
      p_metadata: safeMetadata(input.metadata)
    });
    if (error) {
      if (/estate_log_activity|schema cache|does not exist/i.test(error.message || '')) {
        return fail('Activity log needs estate-activity-events.sql in Supabase.');
      }
      return fail(error);
    }
    if (data?.success === false) return fail(data.error || 'Could not log activity.');
    return ok(data);
  } catch (err) {
    return fail(err?.message || 'Could not log activity.');
  }
}

/** Non-blocking; swallows errors so callers never fail because of logging. */
export function logEstateActivity(input) {
  void writeEstateActivity(input);
}

export async function listEstateActivityEvents(caseNumber, limit = 100) {
  const cn = normalizeEstateCaseNumber(caseNumber);
  if (!cn) return fail('Case number is required.');

  const { data, error } = await supabase.rpc('estate_list_activity_events', {
    p_case_number: cn,
    p_limit: Math.min(500, Math.max(1, Number(limit) || 100))
  });
  if (error) {
    if (/estate_list_activity_events|schema cache|does not exist/i.test(error.message || '')) {
      return fail(
        'Activity log needs a database update. Run supabase-migrations/estate-activity-events.sql in Supabase.'
      );
    }
    return fail(error);
  }
  if (data?.success === false) return fail(data.error || 'Could not load activity.');
  return ok(Array.isArray(data?.events) ? data.events : []);
}

export default {
  writeEstateActivity,
  logEstateActivity,
  listEstateActivityEvents
};
