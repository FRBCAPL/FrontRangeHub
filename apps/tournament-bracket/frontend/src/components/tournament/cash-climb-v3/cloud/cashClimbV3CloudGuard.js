/**
 * Chooses the cloud for every Cash Climb (V3) call. Development and production share one Supabase
 * project, so:
 *   - development build: every call goes to the isolated test cloud when this device's flag is on, and is
 *     refused ('dev-isolation-required') when it is off. The live cloud is never created or called, and a
 *     failing isolated call is reported as it is, never retried against the live cloud.
 *   - production build: calls go to the live cloud only while live saving is enabled; otherwise they are
 *     refused ('cloud-disabled') and tournaments stay on the tablet.
 *   - production build served from this computer or a private network (`localHost()`, which must fail
 *     closed): always refused ('local-host-blocked'), even with live saving enabled.
 * The cloud factories run lazily, the first time a call is routed to them.
 */
export const DEV_ISOLATION_REQUIRED = 'dev-isolation-required';
export const CLOUD_DISABLED = 'cloud-disabled';
export const LOCAL_HOST_BLOCKED = 'local-host-blocked';

const REFUSAL = { 'dev-blocked': DEV_ISOLATION_REQUIRED, 'local-blocked': LOCAL_HOST_BLOCKED, disabled: CLOUD_DISABLED };

export function createCashClimbV3CloudRouter({ live, isolated, devBuild, isolationOn, liveEnabled, localHost = () => true }) {
  let liveApi = null;
  let isolatedApi = null;

  function mode() {
    if (devBuild()) return isolationOn() ? 'isolated' : 'dev-blocked';
    if (!liveEnabled()) return 'disabled';
    let local = true;
    try { local = localHost() !== false; } catch { local = true; }
    return local ? 'local-blocked' : 'live';
  }

  function target() {
    const m = mode();
    if (m === 'isolated') return (isolatedApi ||= isolated());
    if (m === 'live') return (liveApi ||= live());
    return null;
  }

  const refused = (code) => ({ data: null, error: new Error(`ccv3:${code}`), code, detail: null });

  const route = (name) => (...args) => {
    const api = target();
    if (!api) return Promise.resolve(refused(REFUSAL[mode()] || CLOUD_DISABLED));
    return api[name](...args);
  };

  return {
    mode,
    save: route('save'),
    load: route('load'),
    list: route('list'),
    remove: route('remove'),
  };
}
