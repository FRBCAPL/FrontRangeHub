/**
 * Cash Climb Showdown V3 — fixed number of games per qualifying match (all played, ties allowed)
 * and race-length playoffs, with its own payout engine, standings, scoring validation and
 * settlement, all kept in this folder. Like V1 and V2 it is game-agnostic.
 *
 * V3_ENGINE_READY: this build can run a started V3 event.
 * V3_STARTS_ENABLED: operators may start V3 events. It stays off until the V3 screens and the database
 * protections for fixed-length qualifying scores exist; tests start V3 events with the `v3Preview`
 * context flag, which the app never passes.
 */
export const V3_ENGINE_READY = true;
export const V3_STARTS_ENABLED = false;

export const V3_NOT_READY_MESSAGE = 'V3 events cannot be started yet: V3 is still being tested and its database protections are not in place. Choose V1 or V2 to run an event today.';

export const V3_DEFAULTS = { qualifyingGames: 7, playoffRaceTo: 5 };

/** Settings a V3 event uses: the shared ones plus games per qualifying match and the playoff race. */
export const V3_SETTING_KEYS = ['entryFee', 'minEntrants', 'maxEntrants', 'tableCount', 'qualifyingGames', 'playoffRaceTo'];

export function v3Settings(shared, source = {}, preset = {}) {
  return {
    ...shared,
    qualifyingGames: Number(source.qualifyingGames ?? preset.qualifyingGames ?? V3_DEFAULTS.qualifyingGames),
    playoffRaceTo: Number(source.playoffRaceTo ?? preset.v3PlayoffRaceTo ?? V3_DEFAULTS.playoffRaceTo),
  };
}
