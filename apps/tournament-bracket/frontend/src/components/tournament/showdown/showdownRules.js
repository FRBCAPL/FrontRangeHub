/**
 * Cash Climb Showdown — format rules shared by every event.
 * Venue limits (entrant caps, table counts) live in showdownVenuePresets.js.
 * Supported field sizes live in showdownFieldRules.js.
 */

export const SHOWDOWN_TYPE = 'cash-climb-showdown';
/**
 * 3: qualifying pay + qualifier top-up + playoff ladder locked after qualification; 4–8 player playoffs
 * with byes; restart-on-reduction tiebreakers. Events started under an earlier version cannot be run or shown.
 */
export const SHOWDOWN_FORMAT_VERSION = 3;
export const SHOWDOWN_NAME = 'Cash Climb Showdown';

/**
 * Payout engine, stored on each event as `payoutVersion` (independent of the format version).
 *   1: qualifying win pay + qualifier top-ups + playoff ladder (events without the field are V1)
 *   2: per-game pay + qualifying win pay + playoff ladder after a playoff game reserve; no top-ups
 *   3: fixed number of games per qualifying match (ties allowed) with per-game pay (engine in v3/, not runnable yet)
 * Every format is game-agnostic: Showdown only records who wins each game.
 * Operators pick the format when creating an event (see showdownFormats.js). SHOWDOWN_PAYOUT_VERSION is
 * only the engine default when no format is given. Existing events are never converted.
 */
export const SHOWDOWN_PAYOUT_V1 = 1;
export const SHOWDOWN_PAYOUT_V2 = 2;
export const SHOWDOWN_PAYOUT_V3 = 3;
export const SHOWDOWN_PAYOUT_VERSION = SHOWDOWN_PAYOUT_V2;
export const SHOWDOWN_PAYOUT_VERSIONS = [SHOWDOWN_PAYOUT_V1, SHOWDOWN_PAYOUT_V2, SHOWDOWN_PAYOUT_V3];
/** Preselected (never assumed) when an operator creates an event. */
export const RECOMMENDED_PAYOUT_VERSION = SHOWDOWN_PAYOUT_V3;

/**
 * Engine level of this build. Events with a higher `minEngine` are read-only here, and the database refuses
 * saves from builds below an event's `minEngine` (cash_climb_showdown_save_v2).
 * Level 2 runs V3 events; V1 and V2 events still need only level 1, so older builds keep running them.
 */
export const SHOWDOWN_ENGINE_LEVEL = 2;
export const V3_MIN_ENGINE = 2;

export function minEngineFor(payoutVersion) {
  return payoutVersion === SHOWDOWN_PAYOUT_V3 ? V3_MIN_ENGINE : 1;
}

/** V2 fixed race lengths. The game reserve and the funding guarantee depend on them. */
export const V2_QUALIFYING_RACE_TO = 3;
export const V2_PLAYOFF_RACE_TO = 5;
/** V2 pays $1 per game won in a played match. (Internal names keep the original "rack" wording.) */
export const V2_RACK_PAY = 1;
/** Most games a race-to-5 playoff match can have (5–4), so the reserve per scheduled playoff match. */
export const V2_RACK_RESERVE_PER_MATCH = (2 * V2_PLAYOFF_RACE_TO - 1) * V2_RACK_PAY;

/** Approved minimum entry fee in whole dollars. */
export const MIN_ENTRY_FEE = 20;

/** Typed confirmation required before destructive resets. */
export const RESET_CONFIRM_WORD = 'RESET';

/** Losses that eliminate a player from a qualification shootout. */
export const SHOOTOUT_ELIMINATION_LOSSES = 2;

/** V1 default race lengths; the operator may change them during setup. */
export const V1_QUALIFYING_RACE_TO = 3;
export const V1_PLAYOFF_RACE_TO = 5;

/**
 * Shootout procedure. Showdown is game-agnostic: the game and its playing rules are set by the
 * tournament director, so this text describes only the tournament procedure.
 */
export const SHOOTOUT_PROCEDURE = [
  'Each shootout match is a single game.',
  'The first two players in the shootout order decide who starts the first game.',
  'The winner stays at the table. The next player in the order is the incoming challenger and starts the next game.',
  'A second shootout loss eliminates a player.',
];

/** Standings tiebreakers in order. Players still tied after a split start again at the first one. */
export const TIEBREAKERS = [
  { key: 'matchWins', label: 'Match wins' },
  { key: 'gamesWon', label: 'Games won' },
  { key: 'gamesLost', label: 'Fewest games lost' },
  { key: 'headToHead', label: 'Head-to-head' },
  { key: 'oppMatchWins', label: 'Opponents\u2019 match wins' },
  { key: 'oppGameDiff', label: 'Opponents\u2019 game differential' },
];

export function tiebreakerLabel(key) {
  return TIEBREAKERS.find((t) => t.key === key)?.label || '';
}

/** Plain-English tiebreaker rule shown on the operator and public standings. */
export const TIEBREAKER_RULE = [
  'When a tiebreaker separates players, their order is fixed; players still tied start again at tiebreaker 1.',
  'Head-to-head counts only when exactly two players are tied and they played each other in qualifying (a double forfeit does not count).',
  'If one tiebreaker splits three or more players into separate places, those places stand.',
  'Players still tied after all six at the playoff cutoff or the last bye play a shootout, and its result is final.',
].join(' ');
