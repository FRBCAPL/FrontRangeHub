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

/** Approved minimum entry fee in whole dollars. */
export const MIN_ENTRY_FEE = 20;

/** Typed confirmation required before destructive resets. */
export const RESET_CONFIRM_WORD = 'RESET';

/** Losses that eliminate a player from a qualification shootout. */
export const SHOOTOUT_ELIMINATION_LOSSES = 2;

export const SHOWDOWN_RULESETS = {
  'texas-express-9ball': {
    id: 'texas-express-9ball',
    game: '9-Ball',
    label: 'Texas Express 9-Ball',
    qualifyingRaceTo: 3,
    playoffRaceTo: 5,
    rules: [
      'Texas Express 9-Ball rules.',
      'The 9-ball is wild at all times, subject to the applicable legal-shot rules.',
      'Three-foul rule is in effect, including the required warning.',
      'Push-outs are allowed under standard Texas Express rules.',
      'Normal matches: winner breaks, loser racks.',
      'No handicaps.',
    ],
    shootoutRules: [
      'One rack per shootout game, normal 9-Ball rules including the wild 9-ball.',
      'The first two players lag for the opening break.',
      'The winner stays on the table. The incoming challenger breaks.',
      'A second shootout loss eliminates a player.',
    ],
  },
};

export const DEFAULT_RULESET_ID = 'texas-express-9ball';

export function rulesetFor(id) {
  return SHOWDOWN_RULESETS[id] || null;
}

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
