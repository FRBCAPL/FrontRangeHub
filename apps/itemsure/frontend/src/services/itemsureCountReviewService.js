import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

const REVIEW_COLUMNS =
  'session_id, decision, reason, decided_by, decided_at, opening_count, adjustment_count, unchanged_count';

export async function listReviews(organizationId) {
  const rows =
    assertOk(await itemsure.from('count_reviews').select(REVIEW_COLUMNS).eq('organization_id', organizationId), 'count reviews') || [];
  return Object.fromEntries(rows.map((r) => [r.session_id, r]));
}

export async function getReview(sessionId) {
  return assertOk(await itemsure.from('count_reviews').select(REVIEW_COLUMNS).eq('session_id', sessionId).maybeSingle(), 'count review');
}

/** What approval would post right now. Quantities arrive as exact strings. */
export async function previewApproval(sessionId) {
  return assertOk(await itemsure.rpc('preview_count_approval', { p_session_id: sessionId }), 'approval preview');
}

export async function approveCount(sessionId, watermark) {
  return assertOk(
    await itemsure.rpc('approve_count_session', {
      p_session_id: sessionId,
      p_watermark: Number(watermark),
      p_confirmed: true,
    }),
    'approve count',
  );
}

/**
 * For businesses with count approvals switched off: approves a just-submitted count
 * through the normal preview and watermark, exactly as a person clicking Approve would.
 * Returns false (leaving the count waiting for approval) if any line is blocked or
 * anything fails; it never throws.
 */
export async function approveIfClear(sessionId) {
  try {
    const preview = await previewApproval(sessionId);
    if (!preview || preview.reviewed || (preview.lines || []).some((line) => line.blocked_reason)) return false;
    await approveCount(sessionId, preview.watermark);
    return true;
  } catch (e) {
    console.warn('[itemsure] count left for approval', e?.message || e);
    return false;
  }
}

export async function rejectCount(sessionId, reason) {
  const clean = String(reason || '').trim();
  if (!clean) throw new Error('Enter a reason for rejecting this count.');
  assertOk(await itemsure.rpc('reject_count_session', { p_session_id: sessionId, p_reason: clean }), 'reject count');
}