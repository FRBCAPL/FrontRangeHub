import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { ROLE_LABELS } from '../data/itemsureConstants.js';

function one(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

/** People in the organization with their location scope. Needs members.read. */
export async function listMemberAccess(organizationId) {
  const [members, grants] = await Promise.all([
    itemsure
      .from('organization_memberships')
      .select('user_id, role_code, status, location_scope, profiles(full_name, email)')
      .eq('organization_id', organizationId)
      .order('created_at'),
    itemsure.from('location_access').select('user_id, location_id').eq('organization_id', organizationId),
  ]);
  const grantRows = assertOk(grants, 'location access') || [];
  return (assertOk(members, 'members') || []).map((member) => {
    const profile = one(member.profiles);
    return {
      userId: member.user_id,
      name: profile?.full_name || profile?.email || 'Member',
      email: profile?.email || '',
      roleCode: member.role_code,
      roleName: ROLE_LABELS[member.role_code] || member.role_code,
      status: member.status,
      locationScope: member.location_scope === 'restricted' ? 'restricted' : 'all',
      locationIds: grantRows.filter((g) => g.user_id === member.user_id).map((g) => g.location_id),
    };
  });
}

export async function updateMemberAccess(organizationId, userId, { scope, locationIds }, validLocationIds) {
  const locationScope = scope === 'restricted' ? 'restricted' : 'all';
  const allowed = new Set(validLocationIds);
  const chosen = [...new Set(locationIds)].filter((id) => allowed.has(id));

  const updated = assertOk(
    await itemsure
      .from('organization_memberships')
      .update({ location_scope: locationScope })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select('user_id'),
    'update member scope',
  );
  if (!updated?.length) throw new Error('You do not have permission to change this person\u2019s access.');

  assertOk(
    await itemsure.from('location_access').delete().eq('organization_id', organizationId).eq('user_id', userId),
    'clear location access',
  );
  if (locationScope === 'restricted' && chosen.length) {
    assertOk(
      await itemsure
        .from('location_access')
        .insert(chosen.map((locationId) => ({ organization_id: organizationId, user_id: userId, location_id: locationId }))),
      'grant location access',
    );
  }
}
