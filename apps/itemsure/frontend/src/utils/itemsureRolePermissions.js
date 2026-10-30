import { ROLE_SWITCHES } from '../data/itemsureRoleSwitches.js';

/**
 * The permissions a role has in one business: the shared defaults, then this
 * business's choices ([{ permission_code, granted }]) on top. Mirrors itemsure.has_permission.
 */
export function effectivePermissions(defaults, choices = []) {
  const result = new Set(defaults);
  for (const { permission_code: code, granted } of choices) {
    if (granted) result.add(code);
    else result.delete(code);
  }
  return [...result];
}

/**
 * One row per switch for a role: on when every permission in it is held,
 * `partly` when only some are, `changed` when it differs from the default.
 */
export function switchStates(defaults, choices = []) {
  const now = new Set(effectivePermissions(defaults, choices));
  const base = new Set(defaults);
  return ROLE_SWITCHES.map((s) => {
    const held = s.permissions.filter((p) => now.has(p)).length;
    const heldByDefault = s.permissions.filter((p) => base.has(p)).length;
    return {
      ...s,
      on: held === s.permissions.length,
      partly: held > 0 && held < s.permissions.length,
      changed: held !== heldByDefault,
    };
  });
}
