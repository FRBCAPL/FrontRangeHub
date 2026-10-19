import {
  SHOWDOWN_PAYOUT_V1, SHOWDOWN_PAYOUT_V2, SHOWDOWN_PAYOUT_V3, SHOWDOWN_PAYOUT_VERSIONS, SHOWDOWN_ENGINE_LEVEL,
  V2_QUALIFYING_RACE_TO, V2_PLAYOFF_RACE_TO,
} from './showdownRules.js';
import { V3_ENGINE_READY, V3_NOT_READY_MESSAGE } from './v3/showdownV3Format.js';

/**
 * The payout format an event uses: 1, 2 or 3. Events saved before the field existed are V1.
 * Any other value is null (unsupported) and must never be treated as V1.
 */
export function payoutVersionOf(state) {
  if (!state) return null;
  if (state.payoutVersion === undefined) return SHOWDOWN_PAYOUT_V1;
  return SHOWDOWN_PAYOUT_VERSIONS.includes(state.payoutVersion) ? state.payoutVersion : null;
}

export function isPayoutV1(state) {
  return payoutVersionOf(state) === SHOWDOWN_PAYOUT_V1;
}

export function isPayoutV2(state) {
  return payoutVersionOf(state) === SHOWDOWN_PAYOUT_V2;
}

export function isPayoutV3(state) {
  return payoutVersionOf(state) === SHOWDOWN_PAYOUT_V3;
}

export const UPDATE_REQUIRED_MESSAGE = 'This event uses a Cash Climb Showdown format that this version of the app does not support, so it is read-only here. Update the app (reload the page) to continue it.';
export const V3_UPDATE_REQUIRED_MESSAGE = 'This V3 event has already started, and this version of the app cannot run V3 events yet, so it is read-only here. Update the app (reload the page) to continue it.';
export const V3_NO_PLAN_MESSAGE = 'This V3 event has started but has no valid locked V3 payout plan, so it is read-only. Its money cannot be worked out safely.';

/** '' when this build can edit and save the event, otherwise why it is read-only. */
export function formatSupportProblem(state) {
  if (!state) return '';
  if (payoutVersionOf(state) === null) return UPDATE_REQUIRED_MESSAGE;
  if (state.minEngine !== undefined && !(Number.isInteger(state.minEngine) && state.minEngine <= SHOWDOWN_ENGINE_LEVEL)) return UPDATE_REQUIRED_MESSAGE;
  if (isPayoutV3(state) && state.status !== 'setup') {
    if (!V3_ENGINE_READY) return V3_UPDATE_REQUIRED_MESSAGE;
    if (state.payoutPlan?.payoutVersion !== SHOWDOWN_PAYOUT_V3) return V3_NO_PLAN_MESSAGE;
  }
  return '';
}

export function requireSupportedFormat(state) {
  const problem = formatSupportProblem(state);
  if (problem) throw new Error(problem);
}

/** For engine paths that exist only for V1 and V2: an explicit refusal instead of a V1 fallback. */
export function noEngineError(state) {
  return new Error(formatSupportProblem(state) || V3_NOT_READY_MESSAGE);
}

export const V2_RACE_MESSAGE = `Cash Climb Showdown races are fixed: qualifying race to ${V2_QUALIFYING_RACE_TO}, playoffs race to ${V2_PLAYOFF_RACE_TO}.`;

/** '' when the settings use the fixed V2 race lengths, otherwise the reason. */
export function v2RaceProblem(settings) {
  const ok = Number(settings?.qualifyingRaceTo) === V2_QUALIFYING_RACE_TO && Number(settings?.playoffRaceTo) === V2_PLAYOFF_RACE_TO;
  return ok ? '' : V2_RACE_MESSAGE;
}

/** Race length used to validate a score. V2 events always use the fixed races, whatever the settings say. */
export function raceToFor(state, phase) {
  requireSupportedFormat(state);
  if (isPayoutV3(state)) {
    if (phase === 'qualifying') throw new Error('V3 qualifying matches are a fixed number of games, not a race.');
    if (!state.payoutPlan) throw noEngineError(state);
    return state.payoutPlan.playoffRaceTo;
  }
  if (isPayoutV2(state)) return phase === 'qualifying' ? V2_QUALIFYING_RACE_TO : V2_PLAYOFF_RACE_TO;
  if (!isPayoutV1(state)) throw noEngineError(state);
  return Number(phase === 'qualifying' ? state.settings.qualifyingRaceTo : state.settings.playoffRaceTo);
}
