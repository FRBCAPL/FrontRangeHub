import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { getSession, signInAsGuest } from './itemsureAuthService.js';
import { rememberActiveOrg } from './itemsureOrgService.js';

/**
 * Opens or creates this person's private Demo Bar (sample inventory + mock Clover).
 * Returns the organization id. Needs the Demo Bar database update applied.
 */
export async function enterDemo(userId) {
  const orgId = assertOk(await itemsure.rpc('enter_demo'), 'open the Demo Bar');
  if (!orgId) throw new Error('Could not open the Demo Bar.');
  if (userId) rememberActiveOrg(userId, orgId);
  return orgId;
}

/**
 * Try Demo with no sign-in form: starts a guest session if needed, then opens Demo Bar.
 * Returns { orgId, userId }. Caller should navigate / reload workspace after.
 */
export async function tryDemoBar() {
  let session = await getSession();
  if (!session) session = await signInAsGuest();
  const userId = session.user.id;
  const orgId = await enterDemo(userId);
  return { orgId, userId };
}

/** Wipes and reseeds the Demo Bar for this organization. Same org id. */
export async function resetDemo(organizationId) {
  const orgId = assertOk(
    await itemsure.rpc('reset_demo', { p_organization: organizationId }),
    'reset the Demo Bar',
  );
  if (!orgId) throw new Error('Could not reset the Demo Bar.');
  return orgId;
}

/** True when this Clover connection is the seeded Demo merchant (no real token). */
export function isDemoCloverConnection(connection) {
  return Boolean(connection && connection.merchant_id === 'DEMO');
}
