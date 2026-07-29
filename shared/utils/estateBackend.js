/**
 * Single source for the Estate Vault backend origin.
 *
 * Prefers VITE_ESTATE_BACKEND_URL; VITE_BACKEND_URL is deliberately ignored
 * because that often points at a host API without the ESTATE_* keys.
 */
const DEFAULT_ESTATE_BACKEND = 'https://atlasbackend-bnng.onrender.com';

export function estateBackendBase() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ESTATE_BACKEND_URL) {
    return String(import.meta.env.VITE_ESTATE_BACKEND_URL).replace(/\/$/, '');
  }
  return DEFAULT_ESTATE_BACKEND;
}

export default { estateBackendBase };
