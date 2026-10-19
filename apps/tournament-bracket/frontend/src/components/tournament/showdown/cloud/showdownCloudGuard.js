/**
 * Chooses the cloud for every Showdown call, so local development cannot write V3 test events to the
 * live database:
 *   - isolation on (development build + this device's V3 preview flag): every call, for every format,
 *     goes to the isolated test cloud. The live cloud is never called, and a failing isolated call is
 *     reported as it is, never retried against the live cloud.
 *   - development build, isolation off: V3 writes (saves, deletes, phone scores and their decisions) are
 *     refused before reaching the live database, and so is any event this device ever synced with the
 *     isolated test cloud. Deletes, pending lists and phone scores for an event this tab has not seen yet
 *     first check the live copy and are refused if it is V3 or cannot be checked. V1 and V2 otherwise
 *     behave as before.
 *   - production build: every call goes to the live cloud unchanged.
 */
import { isPayoutV3 } from '../showdownPayoutVersion.js';

export const DEV_ISOLATION_REQUIRED = 'dev-isolation-required';

export function createGuardedCloud({ live, isolated, isolationOn, devBuild, isolatedOrigin = () => false }) {
  let iso = null;
  const v3Ids = new Set();
  const isolatedCloud = () => {
    if (!isolationOn()) return null;
    if (!iso) iso = isolated();
    return iso;
  };
  const refused = () => ({ data: null, error: new Error(`showdown:${DEV_ISOLATION_REQUIRED}`), code: DEV_ISOLATION_REQUIRED });
  const remember = (id, event) => { if (id && event && isPayoutV3(event)) v3Ids.add(String(id)); };

  /** Development only: true unless the live copy is confirmed to be absent or V1/V2. */
  const liveV3OrUnknown = async (id, via) => {
    if (!id) return false;
    if (isolatedOrigin(String(id)) || v3Ids.has(String(id))) return true;
    const res = await live[via](id);
    if (res?.error) return true;
    const event = via === 'load' ? res.data?.payload : res.data?.event;
    remember(id, event);
    return v3Ids.has(String(id));
  };

  const route = (name, { before, after } = {}) => async (...args) => {
    const target = isolatedCloud();
    if (target) return target[name](...args);
    if (before && devBuild() && (await before(...args))) return refused();
    const res = await live[name](...args);
    if (after && devBuild()) after(res, ...args);
    return res;
  };

  return {
    /** True while every call is answered by the isolated test cloud. */
    isIsolated: () => Boolean(isolationOn()),
    /** Development build with isolation off: V1 and V2 saves go to the live database. */
    writesLive: () => Boolean(devBuild()) && !isolationOn(),
    save: route('save', {
      before: (state) => { remember(state?.id, state); return isPayoutV3(state) || isolatedOrigin(String(state?.id || '')); },
    }),
    load: route('load', { after: (res, id) => remember(id, res.data?.payload) }),
    list: route('list'),
    remove: route('remove', { before: (id) => liveV3OrUnknown(id, 'load') }),
    // Refusing the pending list keeps V3 submission ids (the only input to decide) from reaching the screen.
    pending: route('pending', { before: (eventId) => liveV3OrUnknown(eventId, 'load') }),
    decide: route('decide'),
    publicList: route('publicList'),
    publicGet: route('publicGet', { after: (res, id) => remember(id, res.data?.event) }),
    publicPending: route('publicPending'),
    submit: route('submit', { before: (sub) => liveV3OrUnknown(sub?.eventId, 'publicGet') }),
    submissionStatus: route('submissionStatus'),
  };
}
