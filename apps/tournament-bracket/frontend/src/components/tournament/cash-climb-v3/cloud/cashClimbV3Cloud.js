/**
 * The app's Cash Climb (V3) cloud, behind the guard in cashClimbV3CloudGuard.js.
 *
 * CASH_CLIMB_V3_LIVE_CLOUD_ENABLED: on since the owner applied cash-climb-v3-cloud-2026-11.sql (site admins
 * are V3 operators; other scorers go in cash_climb_v3_operators). Set it to false to keep V3 tournaments on
 * the tablet again. Development builds and pages served from this computer or a private network never use
 * the live cloud whatever its value.
 */
import { supabase } from '@shared/config/supabase.js';
import { createCashClimbV3CloudApi } from './cashClimbV3CloudApi.js';
import { createCashClimbV3CloudRouter } from './cashClimbV3CloudGuard.js';
import { createCashClimbV3IsolatedCloud } from './cashClimbV3IsolatedCloud.js';
import { cashClimbV3DevBuild, cashClimbV3IsolationOn, cashClimbV3LocalHost } from './cashClimbV3CloudMode.js';
import { createCashClimbV3SyncStore } from './cashClimbV3SyncStore.js';

export const CASH_CLIMB_V3_LIVE_CLOUD_ENABLED = true;

export const cashClimbV3Cloud = createCashClimbV3CloudRouter({
  live: () => createCashClimbV3CloudApi({ client: supabase }),
  isolated: () => createCashClimbV3IsolatedCloud(),
  devBuild: () => cashClimbV3DevBuild(),
  isolationOn: () => cashClimbV3IsolationOn(),
  liveEnabled: () => CASH_CLIMB_V3_LIVE_CLOUD_ENABLED,
  localHost: () => cashClimbV3LocalHost(),
});

/** Sync bookkeeping for the cloud in use: the isolated test cloud's revisions never mix with live ones. */
export const cashClimbV3SyncStore = () => createCashClimbV3SyncStore({ isolated: () => cashClimbV3Cloud.mode() === 'isolated' });
