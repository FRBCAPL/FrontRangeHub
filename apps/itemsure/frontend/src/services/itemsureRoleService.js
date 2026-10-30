import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { ADJUSTABLE_ROLES, ROLE_SWITCHES } from '../data/itemsureRoleSwitches.js';

/**
 * Defaults and this business's choices for Manager and Staff:
 * { manager: { defaults, choices }, staff: { ... } }, or null when the database has no role settings yet.
 */
export async function loadRoleSettings(organizationId) {
  const [defaults, choices] = await Promise.all([
    itemsure.from('role_permissions').select('role_code, permission_code').in('role_code', ADJUSTABLE_ROLES),
    itemsure.from('organization_role_permissions').select('role_code, permission_code, granted').eq('organization_id', organizationId),
  ]);
  if (choices.error) return null;
  const defaultRows = assertOk(defaults, 'role defaults') || [];
  return Object.fromEntries(
    ADJUSTABLE_ROLES.map((role) => [
      role,
      {
        defaults: defaultRows.filter((r) => r.role_code === role).map((r) => r.permission_code),
        choices: (choices.data || []).filter((r) => r.role_code === role),
      },
    ]),
  );
}

/** granted: true = on, false = off, null = back to the default. */
export async function setRolePermissions(organizationId, roleCode, permissions, granted) {
  assertOk(
    await itemsure.rpc('set_role_permissions', { org_id: organizationId, role: roleCode, permission_codes: permissions, granted }),
    'role settings',
  );
}

export function resetRole(organizationId, roleCode) {
  return setRolePermissions(organizationId, roleCode, [...new Set(ROLE_SWITCHES.flatMap((s) => s.permissions))], null);
}
