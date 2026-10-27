/**
 * The check made just before a Cash Climb (V3) result is posted: is the tablet copy still the newest the
 * cloud has? When it is not, nothing is posted; the newer copy (already validated and saved on the tablet)
 * is shown and the operator reviews the match and confirms again. The submitted result is never altered.
 * Offline, cloud off, or never uploaded: post on the tablet as before (sending stays pending).
 */
export const REFRESHED_MESSAGE = 'Another device updated this tournament, and its latest results are now shown. Nothing was posted from this tablet. Review this match and confirm again.';
export const CONFLICT_MESSAGE = 'Another device changed this tournament. Review both copies and choose one before making more changes.';
export const INVALID_MESSAGE = 'The cloud has a newer copy of this tournament, but it failed validation on this tablet, so it was not used and nothing was posted. Use one tablet for scoring this tournament and report this problem.';

/** `checkLatest()` → { state }. Returns null when the result may be posted now, else the refusal to show. */
export async function freshPostCheck(checkLatest) {
  let check;
  try {
    check = await checkLatest();
  } catch {
    check = { state: 'current' };
  }
  if (check?.state === 'refreshed') return { status: 'invalid', refreshed: true, problems: [REFRESHED_MESSAGE] };
  if (check?.state === 'conflict') return { status: 'invalid', problems: [CONFLICT_MESSAGE] };
  if (check?.state === 'invalid') return { status: 'invalid', problems: [INVALID_MESSAGE] };
  return null;
}
