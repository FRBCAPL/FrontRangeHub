/**
 * Cash Climb Tournament - Central Structure Config
 * Single source of truth for format, rules, payouts, and thresholds.
 * Used by: TournamentAdminDashboard, TournamentInfoModal, TournamentRulesModal, bracketGenerator
 */

export const TOURNAMENT_STRUCTURE = {
  // Tournament identity
  name: 'Cash Climb',
  finalStageName: 'King of the Hill',

  // Entry fee
  entryFee: 20,
  entryFeeBreakdown: {
    toTournament: 10,
    toLadderSeed: 10, // total: $9 placement + $1 climber
    toLadderPlacement: 9,
    toClimberSeed: 1,
  },

  // Phase 1: Round Robin
  phase1: {
    name: 'Round Robin',
    eliminationLosses: 3,
    description: 'Everyone plays everyone; each match win earns payout from that round\'s prize pool.',
  },

  // Phase 2: King of the Hill (final stage)
  phase2: {
    name: 'King of the Hill',
    eliminationLosses: 2,
    description: 'Final players compete; winner-stays format with escalating payouts. Last player standing wins.',
    // Player count thresholds for when KOH starts (active players remaining)
    thresholds: [
      { maxPlayers: 6, threshold: 3 },
      { maxPlayers: 10, threshold: 4 },
      { maxPlayers: 15, threshold: 4 },
      { maxPlayers: Infinity, threshold: 6 },
    ],
  },

  // Prize distribution (bracketGenerator)
  prizeDistribution: {
    finalRoundPercent: 0.20, // 20% reserved for final round
    baseAmount: 2,
    scalingFactor: 1.5,
  },

  // Game rules
  gameRules: {
    gameType: '8-Ball',
    raceTo: 5,
    callShots: true,
    rulesNote: 'CSI game play rules with no modifications',
  },

  // Default round robin type by player count (bracketGenerator.determineRoundRobinType)
  roundRobinByPlayerCount: [
    { maxPlayers: 3, type: 'triple' },
    { maxPlayers: 8, type: 'double' },
    { maxPlayers: Infinity, type: 'single' },
  ],
};

/**
 * Get King of the Hill threshold for a given total player count
 * @param {number} playerCount - Total players who started
 * @param {object} [tournament] - Tournament with optional structure_overrides
 */
export function getKOHThreshold(playerCount, tournament = null) {
  const overrides = tournament?.structure_overrides;
  if (overrides?.koh_threshold != null) return overrides.koh_threshold;
  const { thresholds } = TOURNAMENT_STRUCTURE.phase2;
  for (const t of thresholds) {
    if (playerCount <= t.maxPlayers) return t.threshold;
  }
  return 6;
}

/**
 * Get effective structure for a tournament (merges structure_overrides with defaults)
 */
export function getTournamentStructure(tournament = null) {
  const o = tournament?.structure_overrides || {};
  return {
    phase1: { ...TOURNAMENT_STRUCTURE.phase1, eliminationLosses: o.phase1_elimination_losses ?? TOURNAMENT_STRUCTURE.phase1.eliminationLosses },
    phase2: { ...TOURNAMENT_STRUCTURE.phase2, eliminationLosses: o.phase2_elimination_losses ?? TOURNAMENT_STRUCTURE.phase2.eliminationLosses },
    gameRules: {
      ...TOURNAMENT_STRUCTURE.gameRules,
      raceTo: o.race_to ?? TOURNAMENT_STRUCTURE.gameRules.raceTo,
      callShots: o.call_shots ?? TOURNAMENT_STRUCTURE.gameRules.callShots,
    },
    entryFee: tournament?.entry_fee ?? TOURNAMENT_STRUCTURE.entryFee,
  };
}

/**
 * Get display text for format (e.g. "Double Round Robin with Cash Climb")
 */
export function getFormatDisplay(roundRobinType = 'double') {
  const typeLabel = roundRobinType === 'triple' ? 'Triple' : roundRobinType === 'single' ? 'Single' : 'Double';
  return `${typeLabel} Round Robin with ${TOURNAMENT_STRUCTURE.name}`;
}

/**
 * Get elimination rule display text
 */
export function getEliminationDisplay() {
  const p1 = TOURNAMENT_STRUCTURE.phase1;
  const p2 = TOURNAMENT_STRUCTURE.phase2;
  return `${p1.eliminationLosses}-Loss Elimination (Phase 1) • ${p2.eliminationLosses}-Loss Elimination (Phase 2: ${p2.name})`;
}

export default TOURNAMENT_STRUCTURE;
