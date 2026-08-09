/**
 * Role-appropriate copy when a non-PR portal hits a closed estate.
 * DB / RPC messages are written for the Personal Representative.
 */

const CLOSED_HINT =
  /closed for records|reopen it with a written reason|reopen the estate before/i;

export const ESTATE_CLOSED_FAMILY_MESSAGE =
  'This estate has been closed by the Personal Representative. Contact them if you need access.';

/**
 * @param {string} [error]
 * @param {'family'|'helper'|'advisor'|string} [role]
 * @returns {string}
 */
export function mapEstatePortalClosedError(error, role = 'family') {
  const raw = String(error || '').trim();
  if (!raw || !CLOSED_HINT.test(raw)) return raw || '';
  if (role === 'helper') {
    return 'This estate has been closed by the Personal Representative. Helper access is no longer available.';
  }
  if (role === 'advisor') {
    return 'This estate has been closed by the Personal Representative. Advisor access is no longer available.';
  }
  return ESTATE_CLOSED_FAMILY_MESSAGE;
}

export default {
  ESTATE_CLOSED_FAMILY_MESSAGE,
  mapEstatePortalClosedError
};
