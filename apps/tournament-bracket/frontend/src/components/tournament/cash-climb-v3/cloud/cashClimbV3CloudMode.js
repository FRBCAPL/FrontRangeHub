/**
 * Build and device switches for the Cash Climb (V3) cloud. The isolated test cloud needs both a Vite
 * development build (import.meta.env.DEV, false in every production build) and this device's flag.
 */
export const CASH_CLIMB_V3_ISOLATED_FLAG = 'cashClimbV3IsolatedCloud';

const buildEnv = () => ({ DEV: import.meta.env?.DEV, PROD: import.meta.env?.PROD });

export function cashClimbV3DevBuild(env = buildEnv()) {
  return env?.DEV === true && env?.PROD !== true;
}

const PRIVATE_IPV4 = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\.0\.0\.0$/];

/**
 * True when the page is served from this computer or a private network (localhost, loopback, LAN
 * addresses, *.local), or when the address cannot be read. The live cloud is never used from such a
 * page, even by a production build (e.g. `vite preview`) with live saving switched on.
 */
export function cashClimbV3LocalHost(location = globalThis.location) {
  try {
    if (!location || !/^https?:$/.test(location.protocol || '')) return true;
    const host = String(location.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
    if (!host) return true;
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
    if (host === '::1' || host === '::' || /^f[cd][0-9a-f]{2}:/.test(host) || /^fe80:/.test(host)) return true;
    return PRIVATE_IPV4.some((re) => re.test(host));
  } catch {
    return true;
  }
}

export function cashClimbV3IsolationOn(env = buildEnv(), storage = globalThis.localStorage) {
  if (!cashClimbV3DevBuild(env)) return false;
  try {
    return storage?.getItem(CASH_CLIMB_V3_ISOLATED_FLAG) === 'on';
  } catch {
    return false;
  }
}
