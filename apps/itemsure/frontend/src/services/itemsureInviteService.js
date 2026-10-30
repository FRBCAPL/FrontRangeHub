import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { sendInviteLink } from './itemsureAuthService.js';

/** Open invites for a business, or null when the database has no invites yet. Needs members.read. */
export async function listInvites(organizationId) {
  const { data, error } = await itemsure
    .from('invitations')
    .select('id, email, role_code, created_at, expires_at')
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .is('cancelled_at', null)
    .order('created_at');
  if (error) return null;
  return data || [];
}

/**
 * Saves (or refreshes) the invite, then emails the sign-in link.
 * Returns { emailError } so a saved invite with a failed email can offer Resend.
 */
export async function inviteMember(organizationId, email, roleCode) {
  assertOk(
    await itemsure.rpc('invite_member', { org_id: organizationId, invite_email: email, invite_role: roleCode }),
    'invite member',
  );
  try {
    await sendInviteLink(email);
    return { emailError: '' };
  } catch (e) {
    return { emailError: e.message };
  }
}

export async function cancelInvite(inviteId) {
  assertOk(await itemsure.rpc('cancel_invitation', { invite_id: inviteId }), 'cancel invite');
}

/** Invites waiting for the signed-in person. Empty when there are none or the database isn't ready. */
export async function myInvites() {
  const { data, error } = await itemsure.rpc('my_invitations');
  if (error) return [];
  return data || [];
}

/** Accept returns the business id to switch to; decline returns null. */
export async function respondToInvite(inviteId, accept) {
  return assertOk(await itemsure.rpc('respond_to_invitation', { invite_id: inviteId, accept }), 'answer invite');
}
