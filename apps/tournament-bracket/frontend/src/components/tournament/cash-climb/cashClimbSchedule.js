import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { eventRoundPlan } from './cashClimbDuration.js';
import { climbRoundPayouts } from './cashClimbClimb.js';

export { climbRoundPayouts } from './cashClimbClimb.js';

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

  const { baseAmount, scalingFactor } = OPEN_TOURNAMENT_STRUCTURE.prizeDistribution;
  const payouts = [];
  let totalWeight = 0;
  for (let i = 0; i < numRounds; i++) {
    const weight = baseAmount + (i / (numRounds - 1)) * scalingFactor;
    payouts.push(weight);
    totalWeight += weight;
  }

  const scaled = payouts.map((weight) => roundMoney((weight / totalWeight) * pool));
  const totalDistributed = scaled.reduce((sum, val) => sum + val, 0);
  scaled[scaled.length - 1] = roundMoney(scaled[scaled.length - 1] + (pool - totalDistributed));
  return scaled;
}

/** This round's pot: remaining match money respread across remaining expected rounds. */
export function liveRoundPrize(remainingMatchMoney, remainingRounds) {
  const remaining = roundMoney(Math.max(0, Number(remainingMatchMoney) || 0));
  const rounds = Math.max(1, Math.round(Number(remainingRounds) || 1));
  const schedule = calculatePrizeDistribution(remaining, rounds);
  return roundMoney(Math.min(schedule[0] || remaining, remaining));
}

export function calculateMatchPayouts(roundPayout, numMatches, numByeMatches) {
  const totalWeight = numMatches + 0.5 * numByeMatches;
  const regularMatchPayout = totalWeight > 0 ? Math.floor(roundPayout / totalWeight) : 0;
  const byePayout = Math.floor(regularMatchPayout / 2);
  return { perMatch: regularMatchPayout, perBye: byePayout };
}

export function getRoundGameType(roundNumber, gameType) {
  if (gameType !== 'mixed') return gameType;
  const games = ['8-Ball', '9-Ball', '10-Ball'];
  return games[(roundNumber - 1) % 3];
}

export function roundDisplayName(round, gameType) {
  if (!round) return '';
  if (round.koh_round_number != null || round.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName) {
    return OPEN_TOURNAMENT_STRUCTURE.finalStageName;
  }
  const n = Math.max(1, Number(round.round_number) || 1);
  return `Round ${n} (${getRoundGameType(n, gameType)})`;
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

export function previewPrizeSchedule(players, roundRobinType, prizePool, reservedAmount, tournament = null) {
  if (!players || players.length < 2) return null;
  const available = roundMoney(Math.max(0, Number(prizePool || 0) - Number(reservedAmount || 0)));
  const plan = eventRoundPlan(players.length, tournament);
  let leftover = available;
  let lastPerWin = 0;
  const rounds = plan.map((round, i) => {
    const tail = plan.slice(i).map((row) => ({
      matchCount: row.matchCount,
      byeCount: row.byeCount,
    }));
    const payouts = climbRoundPayouts({
      remaining: leftover,
      remainingRounds: tail.length,
      numMatches: round.matchCount,
      numByes: round.byeCount,
      lastPerWin,
      shape: tail,
    });
    const paidThisRound = roundMoney(
      payouts.perMatch * round.matchCount + payouts.perBye * round.byeCount
    );
    leftover = roundMoney(Math.max(0, leftover - paidThisRound));
    lastPerWin = payouts.perMatch;
    return {
      roundNumber: round.roundNumber,
      label: round.label,
      phase: round.phase,
      roundPrize: payouts.roundPrize,
      perWin: payouts.perMatch,
      matchCount: round.matchCount,
      paidThisRound,
      leftover,
    };
  });
  const rrRounds = rounds.filter((r) => r.phase === 'rr').length;
  const kohRounds = rounds.filter((r) => r.phase === 'koh').length;
  return { available, rounds, expectedRounds: plan.length, rrRounds, kohRounds };
}
