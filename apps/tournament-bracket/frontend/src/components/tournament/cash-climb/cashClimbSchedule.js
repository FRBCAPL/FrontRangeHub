import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

export function generateRoundRobin(players, type = 'double') {
  let activePlayers = [...players];
  if (activePlayers.length % 2 !== 0) {
    activePlayers.push({ id: null, name: 'Bye', isBye: true });
  }

  const numPlayers = activePlayers.length;
  const numRounds = numPlayers - 1;
  const matchesPerRound = numPlayers / 2;
  const schedule = [];

  for (let round = 0; round < numRounds; round++) {
    const roundMatches = [];
    for (let i = 0; i < matchesPerRound; i++) {
      const home = activePlayers[i];
      const away = activePlayers[numPlayers - 1 - i];
      if (!home.isBye || !away.isBye) {
        roundMatches.push({
          player1: home,
          player2: away,
          isBye: Boolean(home.isBye || away.isBye),
        });
      }
    }
    schedule.push({ roundNumber: round + 1, matches: roundMatches });
    activePlayers.splice(1, 0, activePlayers.pop());
  }

  if (type === 'double' || type === 'triple') {
    const baseLength = schedule.length;
    for (let i = 0; i < baseLength; i++) {
      const original = schedule[i];
      schedule.push({
        roundNumber: schedule.length + 1,
        matches: original.matches.map((match) => ({
          player1: match.player2,
          player2: match.player1,
          isBye: match.isBye,
        })),
      });
    }
  }

  if (type === 'triple') {
    const baseLength = numRounds;
    for (let i = 0; i < baseLength; i++) {
      schedule.push({
        roundNumber: schedule.length + 1,
        matches: [...schedule[i].matches],
      });
    }
  }

  return schedule;
}

export function calculatePrizeDistribution(totalPrizePool, numRounds) {
  const pool = roundMoney(totalPrizePool);
  if (numRounds <= 0) return [];
  if (numRounds === 1) return [pool];

  const { baseAmount, scalingFactor, finalRoundPercent } = OPEN_TOURNAMENT_STRUCTURE.prizeDistribution;
  const finalRoundPayout = roundMoney(pool * finalRoundPercent);
  const remainingPool = roundMoney(pool - finalRoundPayout);

  if (numRounds === 2) {
    const first = remainingPool;
    return [first, roundMoney(pool - first)];
  }

  const payouts = [];
  let totalWeight = 0;
  for (let i = 1; i < numRounds; i++) {
    const weight = baseAmount + ((i - 1) / (numRounds - 2)) * scalingFactor;
    payouts.push(weight);
    totalWeight += weight;
  }

  const scaled = payouts.map((weight) => roundMoney((weight / totalWeight) * remainingPool));
  scaled.push(finalRoundPayout);
  const totalDistributed = scaled.reduce((sum, val) => sum + val, 0);
  scaled[scaled.length - 1] = roundMoney(scaled[scaled.length - 1] + (pool - totalDistributed));
  return scaled;
}

export function calculateMatchPayouts(roundPayout, numMatches, numByeMatches) {
  const totalWeight = numMatches + 0.5 * numByeMatches;
  const regularMatchPayout = totalWeight > 0 ? Math.floor((roundPayout / totalWeight) * 100) / 100 : 0;
  const byePayout = Math.floor((regularMatchPayout / 2) * 100) / 100;
  return { perMatch: regularMatchPayout, perBye: byePayout };
}

export function buildKohPayouts(kohPrizePool, playerCount) {
  const pool = roundMoney(kohPrizePool);
  const maxMatches = Math.max(1, playerCount * 2);
  const weights = [];
  let totalWeight = 0;
  for (let i = 1; i <= maxMatches; i++) {
    const weight = 1 + ((i - 1) / Math.max(1, maxMatches - 1)) * 0.5;
    weights.push(weight);
    totalWeight += weight;
  }
  const scaled = weights.map((weight) => roundMoney((weight / totalWeight) * pool));
  const total = scaled.reduce((sum, val) => sum + val, 0);
  scaled[scaled.length - 1] = roundMoney(scaled[scaled.length - 1] + (pool - total));
  return scaled;
}

export function getRoundGameType(roundNumber, gameType) {
  if (gameType !== 'mixed') return gameType;
  const games = ['8-Ball', '9-Ball', '10-Ball'];
  return games[(roundNumber - 1) % 3];
}

/**
 * One round of round robin: each remaining player plays at most once.
 * roundOffset rotates pairings so later rounds are not the same as round 1.
 */
export function pairOneRound(players, roundOffset = 0) {
  const schedule = generateRoundRobin(players, 'single');
  if (!schedule.length) return { roundNumber: 1, matches: [] };
  const index = ((roundOffset % schedule.length) + schedule.length) % schedule.length;
  return schedule[index];
}

export function previewPrizeSchedule(players, roundRobinType, prizePool, firstPlacePrize) {
  if (!players || players.length < 2) return null;
  const available = roundMoney(Math.max(0, Number(prizePool || 0) - Number(firstPlacePrize || 0)));
  const schedule = generateRoundRobin(players, roundRobinType);
  const prizes = calculatePrizeDistribution(available, schedule.length);
  const rounds = schedule.map((round, i) => {
    const byeCount = round.matches.filter((m) => m.isBye).length;
    const regular = round.matches.length - byeCount;
    const payouts = calculateMatchPayouts(prizes[i] || 0, regular, byeCount);
    return {
      roundNumber: round.roundNumber,
      roundPrize: prizes[i] || 0,
      perWin: payouts.perMatch,
      matchCount: regular,
    };
  });
  return { available, rounds };
}
