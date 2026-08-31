/**
 * Cash Climb format for OPEN tournaments (not tied to any ladder).
 * Copied from the ladder tournament format; this file is the standalone source.
 */

export const OPEN_TOURNAMENT_STRUCTURE = {
  name: 'Cash Climb',
  finalStageName: 'King of the Hill',

  entryFee: 20,
  /** Open events: the full entry fee funds this tournament's prize pool. */
  entryFeeBreakdown: {
    toTournament: 20,
    toPlatform: 0,
  },

  phase1: {
    name: 'Round Robin',
    eliminationLosses: 3,
    description: 'Everyone plays everyone; each match win earns a payout from that round\'s prize pool.',
  },

  phase2: {
    name: 'King of the Hill',
    eliminationLosses: 2,
    description: 'Winner-stays format. Starts when 3 players remain. Unused KOH is the championship. Unused RR leftover for 3rd is paid when they sit. Last two may chop remaining leftover.',
    thresholds: [
      { maxPlayers: Infinity, threshold: 3 },
    ],
  },

  prizeDistribution: {
    baseAmount: 2,
    /** Live Cash Climb uses a $1 per-win ladder in cashClimbClimb.js, not this weight. */
    scalingFactor: 0,
  },

  /** Unused for live events. Last standing is leftover after the match climb is funded. */
  placePotPercent: 0,
  /**
   * v1 leftover splits only. Live v2 events park unused KOH as championship
   * and split unused RR 60/40 to 2nd and 3rd.
   */
  placeSplits: {
    1: [1],
    2: [0.35, 0.65],
    3: [0.22, 0.48, 0.3],
    4: [0.2, 0.5, 0.18, 0.12],
  },

  gameRules: {
    gameType: '8-Ball',
    raceTo: 1,
    kohRaceTo: 2,
    callShots: true,
    rulesNote: 'CSI game play rules, with one house rule',
    houseRules: [
      'No 9 on the break. If the 9-ball is pocketed on the break, spot it and the shooter continues with the table as it lays.',
    ],
  },

  roundRobinByPlayerCount: [
    { maxPlayers: 3, type: 'triple' },
    { maxPlayers: 8, type: 'double' },
    { maxPlayers: Infinity, type: 'single' },
  ],
};

export const CASH_CLIMB_GAME_TYPES = [
  { value: '8-Ball', label: '8-Ball' },
  { value: '9-Ball', label: '9-Ball' },
  { value: '10-Ball', label: '10-Ball' },
  { value: 'mixed', label: 'Mixed' },
  { value: "Lagger's Choice", label: "Lagger's Choice" },
];

export function isCashClimbGameType(gameType) {
  return CASH_CLIMB_GAME_TYPES.some((g) => g.value === gameType);
}

export const CASH_CLIMB_PLAYED_GAMES = ['8-Ball', '9-Ball', '10-Ball'];

export function isLaggersChoice(gameType) {
  return String(gameType || '').replace(/['’]/g, '').toLowerCase().trim() === 'laggers choice';
}

export function getKOHThreshold(playerCount, tournament = null) {
  const override = tournament?.koh_threshold;
  if (override != null && override !== '') return Number(override);
  const { thresholds } = OPEN_TOURNAMENT_STRUCTURE.phase2;
  for (const t of thresholds) {
    if (playerCount <= t.maxPlayers) return t.threshold;
  }
  return 3;
}

export function determineRoundRobinType(playerCount) {
  for (const rule of OPEN_TOURNAMENT_STRUCTURE.roundRobinByPlayerCount) {
    if (playerCount <= rule.maxPlayers) return rule.type;
  }
  return 'single';
}

export function getFormatDisplay(roundRobinType = 'double') {
  const typeLabel = roundRobinType === 'triple' ? 'Triple' : roundRobinType === 'single' ? 'Single' : 'Double';
  return `${typeLabel} Round Robin with ${OPEN_TOURNAMENT_STRUCTURE.name}`;
}

export default OPEN_TOURNAMENT_STRUCTURE;
