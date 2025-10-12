/**
 * Bracket Generator
 * Creates round robin tournament schedules with automatic bye handling
 */

/**
 * Generate a round robin tournament schedule
 * @param {Array} players - Array of player objects {id, name}
 * @param {string} type - 'single', 'double', or 'triple'
 * @returns {Array} Array of rounds, each containing matches
 */
export function generateRoundRobin(players, type = 'double') {
  // Make a copy to avoid mutating original
  let activePlayers = [...players];
  
  // Handle odd number of players - add "Bye"
  const needsBye = activePlayers.length % 2 !== 0;
  if (needsBye) {
    activePlayers.push({ id: null, name: 'Bye', isBye: true });
  }
  
  const numPlayers = activePlayers.length;
  const numRounds = numPlayers - 1;
  const matchesPerRound = numPlayers / 2;
  
  const schedule = [];
  
  // Generate base round robin using circle method
  // Player at index 0 stays fixed, others rotate
  for (let round = 0; round < numRounds; round++) {
    const roundMatches = [];
    
    for (let i = 0; i < matchesPerRound; i++) {
      const home = activePlayers[i];
      const away = activePlayers[numPlayers - 1 - i];
      
      // Only add match if neither player is Bye (for the first round)
      // Or if one is Bye (for the actual bye match)
      if (!home.isBye || !away.isBye) {
        roundMatches.push({
          player1: home,
          player2: away,
          isBye: home.isBye || away.isBye
        });
      }
    }
    
    schedule.push({
      roundNumber: round + 1,
      matches: roundMatches
    });
    
    // Rotate players (keep first player fixed, rotate others)
    // Move last player to position 1, shift everyone else down
    activePlayers.splice(1, 0, activePlayers.pop());
  }
  
  // For double round robin, add reverse matches
  if (type === 'double') {
    const baseScheduleLength = schedule.length;
    for (let i = 0; i < baseScheduleLength; i++) {
      const originalRound = schedule[i];
      const reversedMatches = originalRound.matches.map(match => ({
        player1: match.player2,
        player2: match.player1,
        isBye: match.isBye
      }));
      
      schedule.push({
        roundNumber: schedule.length + 1,
        matches: reversedMatches
      });
    }
  }
  
  // For triple round robin, add third rotation
  if (type === 'triple') {
    const baseScheduleLength = numRounds;
    
    // Add second rotation (reverse matches)
    for (let i = 0; i < baseScheduleLength; i++) {
      const originalRound = schedule[i];
      const reversedMatches = originalRound.matches.map(match => ({
        player1: match.player2,
        player2: match.player1,
        isBye: match.isBye
      }));
      
      schedule.push({
        roundNumber: schedule.length + 1,
        matches: reversedMatches
      });
    }
    
    // Add third rotation (original matches again)
    for (let i = 0; i < baseScheduleLength; i++) {
      const originalRound = schedule[i];
      schedule.push({
        roundNumber: schedule.length + 1,
        matches: [...originalRound.matches]
      });
    }
  }
  
  return schedule;
}

/**
 * Calculate prize distribution across rounds
 * @param {number} totalPrizePool - Total amount to distribute
 * @param {number} numRounds - Number of rounds
 * @returns {Array} Array of payout amounts per round
 */
export function calculatePrizeDistribution(totalPrizePool, numRounds) {
  const baseAmount = 2;
  const scalingFactor = 1.5;
  
  // Allocate 20% to final round
  const finalRoundPayout = totalPrizePool * 0.20;
  const remainingPool = totalPrizePool - finalRoundPayout;
  
  // Calculate incremental payouts for other rounds
  const payouts = [];
  let totalWeight = 0;
  
  for (let i = 1; i < numRounds; i++) {
    const weight = baseAmount + ((i - 1) / (numRounds - 2)) * scalingFactor;
    payouts.push(weight);
    totalWeight += weight;
  }
  
  // Scale payouts to match remaining pool
  const scaledPayouts = payouts.map(weight => 
    Math.round((weight / totalWeight) * remainingPool)
  );
  
  // Add final round payout
  scaledPayouts.push(Math.round(finalRoundPayout));
  
  // Adjust last payout to ensure total matches exactly
  const totalDistributed = scaledPayouts.reduce((sum, val) => sum + val, 0);
  const difference = totalPrizePool - totalDistributed;
  scaledPayouts[scaledPayouts.length - 1] += difference;
  
  return scaledPayouts;
}

/**
 * Calculate payout per match in a round
 * @param {number} roundPayout - Total payout for the round
 * @param {number} numMatches - Number of matches in the round
 * @param {number} numByeMatches - Number of bye matches in the round
 * @returns {object} { perMatch, perBye, redistributed }
 */
export function calculateMatchPayouts(roundPayout, numMatches, numByeMatches) {
  // Calculate based on weighted total where byes count as 0.5
  // Total weight = numMatches + (0.5 × numByeMatches)
  // So: regularMatchPayout × numMatches + byePayout × numByeMatches = roundPayout
  // And: byePayout = 0.5 × regularMatchPayout
  // Therefore: regularMatchPayout × (numMatches + 0.5 × numByeMatches) = roundPayout
  
  const totalWeight = numMatches + (0.5 * numByeMatches);
  const regularMatchPayout = totalWeight > 0 ? Math.floor((roundPayout / totalWeight) * 100) / 100 : 0;
  const byePayout = Math.floor((regularMatchPayout / 2) * 100) / 100;
  
  return {
    perMatch: regularMatchPayout,
    perBye: byePayout,
    basePerMatch: regularMatchPayout
  };
}

/**
 * Determine round robin type based on player count
 * @param {number} playerCount - Number of players
 * @returns {string} 'single', 'double', or 'triple'
 */
export function determineRoundRobinType(playerCount) {
  if (playerCount <= 3) {
    return 'triple'; // Need more matches for small fields
  } else if (playerCount <= 8) {
    return 'double'; // Standard for small-medium fields
  } else {
    return 'single'; // Single round robin for larger fields
  }
}

/**
 * Regenerate bracket with only active players (after eliminations)
 * @param {Array} activePlayers - Players still in tournament
 * @param {string} type - Round robin type
 * @param {number} startingRoundNumber - What round number to start from
 * @returns {Array} New schedule starting from startingRoundNumber
 */
export function regenerateBracket(activePlayers, type, startingRoundNumber) {
  const schedule = generateRoundRobin(activePlayers, type);
  
  // Adjust round numbers to continue from where we left off
  return schedule.map((round, index) => ({
    ...round,
    roundNumber: startingRoundNumber + index
  }));
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get game type for a round (for mixed game tournaments)
 * @param {number} roundNumber - Current round number
 * @param {string} gameType - Tournament game type
 * @returns {string} Game type for this round
 */
export function getRoundGameType(roundNumber, gameType) {
  if (gameType !== 'mixed') {
    return gameType;
  }
  
  // Cycle through 8-Ball, 9-Ball, 10-Ball
  const games = ['8-Ball', '9-Ball', '10-Ball'];
  return games[(roundNumber - 1) % 3];
}

/**
 * Create database-ready round and match objects
 * @param {string} tournamentId - Tournament ID
 * @param {Array} schedule - Schedule from generateRoundRobin
 * @param {Array} prizeDistribution - Payout per round
 * @param {string} gameType - Tournament game type
 * @returns {object} { rounds, matches }
 */
export function prepareDatabaseObjects(tournamentId, schedule, prizeDistribution, gameType) {
  const rounds = [];
  const matches = [];
  
  schedule.forEach((round, roundIndex) => {
    // Generate a proper UUID for the round
    const roundId = crypto.randomUUID();
    const roundGameType = getRoundGameType(round.roundNumber, gameType);
    const roundPrize = prizeDistribution[roundIndex] || 0;
    
    // Count bye matches
    const byeMatches = round.matches.filter(m => m.isBye).length;
    const regularMatches = round.matches.length - byeMatches;
    
    // Calculate payouts
    const payouts = calculateMatchPayouts(roundPrize, regularMatches, byeMatches);
    
    // Create round object
    rounds.push({
      id: roundId,
      tournament_id: tournamentId,
      round_number: round.roundNumber,
      round_name: `Round ${round.roundNumber} (${roundGameType})`,
      game_type: roundGameType,
      prize_per_round: roundPrize,
      status: 'pending'
    });
    
    // Create match objects - all regular matches pay the same, all byes pay the same
    round.matches.forEach((match, matchIndex) => {
      const payout = match.isBye ? payouts.perBye : payouts.perMatch;
      
      matches.push({
        tournament_id: tournamentId,
        round_id: roundId,
        round_number: round.roundNumber,
        match_number: matchIndex + 1,
        player1_id: match.player1.id,
        player1_name: match.player1.name,
        player2_id: match.player2.isBye ? null : match.player2.id,
        player2_name: match.player2.isBye ? null : match.player2.name,
        is_bye: match.isBye,
        payout_amount: payout,
        status: match.isBye ? 'completed' : 'pending',
        winner_id: match.isBye ? match.player1.id : null,
        winner_name: match.isBye ? match.player1.name : null
      });
    });
  });
  
  return { rounds, matches };
}

export default {
  generateRoundRobin,
  calculatePrizeDistribution,
  calculateMatchPayouts,
  determineRoundRobinType,
  regenerateBracket,
  shuffleArray,
  getRoundGameType,
  prepareDatabaseObjects
};

