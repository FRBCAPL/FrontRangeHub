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
    description: 'Winner-stays format. Starts when 3 players remain. Last player standing wins remaining pool.',
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
  placeSplits: {
    1: [1],
    2: [0.65, 0.35],
    3: [0.5, 0.3, 0.2],
    4: [0.4, 0.25, 0.2, 0.15],
  },

  gameRules: {
    gameType: '8-Ball',
    raceTo: 5,
    callShots: true,
    rulesNote: 'CSI game play rules with no modifications',
  },

  roundRobinByPlayerCount: [
    { maxPlayers: 3, type: 'triple' },
    { maxPlayers: 8, type: 'double' },
    { maxPlayers: Infinity, type: 'single' },
  ],
};

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
