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
    description: 'Winner-stays format with escalating payouts. Last player standing wins remaining pool.',
    thresholds: [
      { maxPlayers: 6, threshold: 3 },
      { maxPlayers: 10, threshold: 4 },
      { maxPlayers: 15, threshold: 4 },
      { maxPlayers: Infinity, threshold: 6 },
    ],
  },

  prizeDistribution: {
    finalRoundPercent: 0.2,
    baseAmount: 2,
    scalingFactor: 1.5,
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
  return 6;
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
