/**
 * Development-only V3 preview. V3 starts stay disabled (V3_STARTS_ENABLED); this lets a developer start
 * a V3 event on one device to walk through the operator, player, TV and phone screens. It needs both a
 * Vite development build (import.meta.env.DEV, false in every production build) and the device flag below.
 * While it is on, every Showdown cloud call uses the isolated test cloud (cloud/showdownCloudGuard.js).
 */
export const V3_PREVIEW_FLAG = 'showdownV3Preview';

export const V3_PREVIEW_NOTICE = 'Development preview: V3 starts are enabled on this device only, for testing, and every Showdown cloud save, phone score and TV read uses this browser\u2019s isolated test cloud, never the live database. Production builds cannot start V3 events.';

const buildEnv = () => ({ DEV: import.meta.env?.DEV, PROD: import.meta.env?.PROD });

export function v3PreviewAvailable(env = buildEnv()) {
  return env?.DEV === true && env?.PROD !== true;
}

export function v3PreviewOn(env = buildEnv()) {
  if (!v3PreviewAvailable(env)) return false;
  try {
    return localStorage.getItem(V3_PREVIEW_FLAG) === 'on';
  } catch {
    return false;
  }
}
