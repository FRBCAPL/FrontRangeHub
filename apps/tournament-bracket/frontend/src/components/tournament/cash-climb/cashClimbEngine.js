import {
  OPEN_TOURNAMENT_STRUCTURE,
  determineRoundRobinType,
  getKOHThreshold,
} from './openTournamentStructure.js';
import {
  pairOneRound,
  calculatePrizeDistribution,
  climbRoundPayouts,
  getRoundGameType,
} from './cashClimbSchedule.js';
import { remainingEventRoundsFromState, climbShapeForPayout, remainingClimbShape } from './cashClimbDuration.js';
import { minimumClimbCost } from './cashClimbClimb.js';
import {
  computePlacePrizes,
  lastStandingFinishers,
  parsePlaceCount,
  reservedPlaceTotal,
} from './cashClimbPlacePrizes.js';
import { PAYOUT_MODEL_V2 } from './cashClimbPayoutConfig.js';
import { splitFinishAwards } from './cashClimbFinishAwards.js';
import {
  attachPayoutPlan,
  isPayoutV2,
  lockedRoundPayouts,
  remainingPhaseBudget,
} from './cashClimbPayoutRuntime.js';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function parseRaceTo(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return OPEN_TOURNAMENT_STRUCTURE.gameRules.raceTo;
  return Math.min(21, n);
}

function parseTableCount(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return 4;
  return Math.min(48, n);
}

export function todayDateInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatTournamentDate(value) {
  if (!value) return '';
  const [y, m, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !day) return '';
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function clone(state) {
  return JSON.parse(JSON.stringify(state));
}

export function createOpenTournament(config) {
  const players = (config.players || []).map((p) => ({
    id: p.id || uid(),
    name: p.name,
    email: p.email || '',
    fargorate: p.fargorate || p.fargoRate || '',
  }));
  const entryFee = Number(config.entryFee ?? OPEN_TOURNAMENT_STRUCTURE.entryFee) || 0;
  const roundRobinType = config.roundRobinType || determineRoundRobinType(players.length);
  const totalPrizePool = money(entryFee * players.length);
  const next = {
    id: uid(),
    name: config.name || 'Cash Climb',
    type: 'cash-climb',
    status: 'setup',
    tournamentDate: config.tournamentDate || todayDateInput(),
    gameType: config.gameType || OPEN_TOURNAMENT_STRUCTURE.gameRules.gameType,
    roundRobinType,
    entryFee,
    payoutModel: PAYOUT_MODEL_V2,
    firstPlacePercent: 0,
    firstPlacePrize: 0,
    placeCount: 3,
    placePrizes: { first: 0, second: 0, third: 0, fourth: 0 },
    raceTo: parseRaceTo(config.raceTo),
    tableCount: parseTableCount(config.tableCount),
    callShots: config.callShots ?? OPEN_TOURNAMENT_STRUCTURE.gameRules.callShots,
    phase1EliminationLosses: OPEN_TOURNAMENT_STRUCTURE.phase1.eliminationLosses,
    phase2EliminationLosses: OPEN_TOURNAMENT_STRUCTURE.phase2.eliminationLosses,
    koh_threshold: config.kohThreshold === '' || config.kohThreshold == null ? null : Number(config.kohThreshold),
    totalPrizePool,
    players,
    stats: [],
    rounds: [],
    matches: [],
    kohPrizePool: 0,
    kohPayouts: [],
    prizeSchedule: [],
    pairingOffset: 0,
    eliminationSeq: 0,
    winner: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    message: null,
  };
  attachPayoutPlan(next, players.length);
  return next;
}

export function getActivePlayers(state) {
  return (state.stats || []).filter((p) => !p.eliminated);
}

export function getCurrentRound(state) {
  const kohLive = (state.rounds || []).find((r) => isKohRound(r) && r.status === 'in-progress');
  if (kohLive) return kohLive;
  const rrLive = (state.rounds || []).find((r) => !isKohRound(r) && r.status === 'in-progress');
  if (rrLive) return rrLive;
  const kohStarted = (state.rounds || []).some((r) => isKohRound(r));
  if (kohStarted) return (state.rounds || []).filter(isKohRound).slice(-1)[0] || null;
  return (state.rounds || []).find((r) => r.status === 'pending') || null;
}

export function getRoundMatches(state, roundId) {
  return (state.matches || []).filter((m) => m.round_id === roundId).sort((a, b) => a.match_number - b.match_number);
}

export function sortStandings(stats) {
  return [...(stats || [])].sort((a, b) => {
    if (Boolean(a.eliminated) !== Boolean(b.eliminated)) return a.eliminated ? 1 : -1;
    if ((b.total_payout || 0) !== (a.total_payout || 0)) return (b.total_payout || 0) - (a.total_payout || 0);
    return (b.wins || 0) - (a.wins || 0);
  });
}

function paidOutTotal(state) {
  return money((state.stats || []).reduce((sum, p) => sum + (p.total_payout || 0), 0));
}

function remainingUnpaid(state) {
  return Math.max(0, money((state.totalPrizePool || 0) - paidOutTotal(state)));
}

function remainingAfterReserved(state) {
  return Math.max(0, money((state.totalPrizePool || 0) - reservedPlaceTotal(state) - paidOutTotal(state)));
}

function assignPlacePrizes(state, places) {
  state.placeCount = places.placeCount;
  state.placePrizes = {
    first: places.first,
    second: places.second,
    third: places.third,
    fourth: places.fourth,
  };
  state.firstPlacePrize = places.first;
  state.firstPlacePercent = places.potPercent;
  return places;
}

function syncPlacePrizesForShape(state, shape, lastPerWin) {
  return assignPlacePrizes(state, computePlacePrizes({
    prizePool: remainingUnpaid(state),
    placeCount: state.placeCount,
    climbNeed: minimumClimbCost(shape, lastPerWin),
  }));
}

export function lastCompletedClimb(state, koh = false) {
  const rounds = [...(state.rounds || [])].reverse();
  const last = rounds.find((r) => {
    if (r.status !== 'completed') return false;
    return Boolean(r.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName) === Boolean(koh);
  });
  if (!last) return { perWin: 0, roundPrize: 0, round: null };
  const perWin = (state.matches || []).reduce((max, m) => {
    if (m.round_id !== last.id || m.is_bye || m.status === 'cancelled') return max;
    return Math.max(max, Math.round(Number(m.payout_amount) || 0));
  }, 0);
  return { perWin, roundPrize: Number(last.prize_per_round) || 0, round: last };
}

function lastPerWinForPhase(state) {
  return Math.max(
    lastCompletedClimb(state, false).perWin,
    lastCompletedClimb(state, true).perWin
  );
}

function consumePrizeRound(state) {
  const stored = Math.round(Number(state.prizeRoundsLeft));
  const current = Number.isFinite(stored) && stored >= 1
    ? stored
    : remainingEventRoundsFromState(state);
  state.prizeRoundsLeft = Math.max(1, current - 1);
}

function climbNeedShape(state, numMatches, numByes) {
  const live = remainingClimbShape(state);
  const current = {
    matchCount: Math.max(0, Math.round(Number(numMatches) || 0)),
    byeCount: Math.max(0, Math.round(Number(numByes) || 0)),
  };
  if (!live.length) return [current];
  return [current, ...live.slice(1)];
}

function payoutsForNewRound(state, numMatches, numByes, koh = false) {
  if (isPayoutV2(state)) {
    const payouts = lockedRoundPayouts(state, numMatches, numByes, koh);
    if (koh) state.lastKohPerWin = payouts.perMatch;
    else state.lastRrPerWin = payouts.perMatch;
    return payouts;
  }
  const shape = climbShapeForPayout(state, numMatches, numByes);
  const lastPerWin = lastPerWinForPhase(state);
  syncPlacePrizesForShape(state, climbNeedShape(state, numMatches, numByes), lastPerWin);
  const payouts = climbRoundPayouts({
    remaining: remainingAfterReserved(state),
    remainingRounds: Math.max(1, shape.length),
    numMatches,
    numByes,
    lastPerWin,
    shape,
  });
  if (koh) state.lastKohPerWin = payouts.perMatch;
  else state.lastRrPerWin = payouts.perMatch;
  return payouts;
}

export function recomputePendingRoundPayouts(state) {
  const round = getCurrentRound(state);
  if (!round) return;
  const matches = getRoundMatches(state, round.id);
  const pending = matches.filter((m) => m.status === 'pending');
  if (!pending.length) return;
  if (matches.some((m) => m.status === 'completed' && !m.is_bye && m.player2_id)) return;
  const koh = isKohRound(round);
  const regular = pending.filter((m) => !m.is_bye && m.player2_id);
  const byes = pending.filter((m) => m.is_bye || !m.player2_id);
  let payouts;
  if (isPayoutV2(state)) {
    payouts = lockedRoundPayouts(state, regular.length, byes.length, koh);
  } else {
    const shape = climbShapeForPayout(state, regular.length, byes.length);
    const lastPerWin = lastPerWinForPhase(state);
    syncPlacePrizesForShape(state, climbNeedShape(state, regular.length, byes.length), lastPerWin);
    payouts = climbRoundPayouts({
      remaining: remainingAfterReserved(state),
      remainingRounds: Math.max(1, shape.length),
      numMatches: regular.length,
      numByes: byes.length,
      lastPerWin,
      shape,
    });
  }
  round.prize_per_round = payouts.roundPrize;
  regular.forEach((m) => {
    m.payout_amount = payouts.perMatch;
  });
  byes.forEach((m) => {
    m.payout_amount = payouts.perBye;
  });
  if (koh) state.lastKohPerWin = payouts.perMatch;
  else state.lastRrPerWin = payouts.perMatch;
}

function creditPayout(state, player, amount, allowReserved = false, match = null) {
  if (!player) return 0;
  let cap = remainingUnpaid(state);
  if (!allowReserved) {
    if (isPayoutV2(state)) {
      const round = match ? (state.rounds || []).find((r) => r.id === match.round_id) : null;
      cap = remainingPhaseBudget(state, isKohRound(round), match?.id || null);
    } else {
      cap = remainingAfterReserved(state);
    }
  }
  const amt = money(Math.min(Math.max(0, Number(amount) || 0), cap));
  if (amt <= 0) return 0;
  player.total_payout = money((player.total_payout || 0) + amt);
  return amt;
}

function isByeName(name) {
  return String(name || '').trim().toLowerCase() === 'bye';
}

function isByeMatch(match) {
  if (!match) return false;
  if (match.is_bye || match.isBye) return true;
  if (!match.player2_id) return true;
  if (isByeName(match.player2_name)) return true;
  if (match.player1_id && match.player1_id === match.player2_id) return true;
  return false;
}

function playerAlreadyInRound(state, roundId, playerId, exceptMatchId) {
  if (!playerId || !roundId) return false;
  return (state.matches || []).some((m) => {
    if (exceptMatchId && m.id === exceptMatchId) return false;
    if (m.round_id !== roundId) return false;
    if (m.status === 'cancelled') return false;
    return m.player1_id === playerId || m.player2_id === playerId || m.winner_id === playerId;
  });
}

function applyByeWin(state, match) {
  const alreadyDone = match.status === 'completed' && match.is_bye;
  match.status = 'completed';
  match.is_bye = true;
  match.player2_id = null;
  match.player2_name = null;
  match.loser_id = null;
  match.loser_name = null;
  match.winner_id = match.player1_id;
  match.winner_name = match.player1_name;
  match.completed_at = match.completed_at || new Date().toISOString();
  if (alreadyDone) return;
  const winner = state.stats.find((p) => p.player_id === match.player1_id);
  if (winner) {
    winner.wins += 1;
    match.payout_amount = creditPayout(state, winner, match.payout_amount, false, match);
  }
}

function normalizeByeMatch(raw) {
  const p1Bye = !raw.player1 || raw.player1.isBye || isByeName(raw.player1.name);
  const p2Bye = !raw.player2 || raw.player2.isBye || isByeName(raw.player2.name);
  const real = p1Bye ? raw.player2 : raw.player1;
  return {
    isBye: Boolean(p1Bye || p2Bye),
    player1: real,
    player2: p1Bye || p2Bye ? { id: null, name: null, isBye: true } : raw.player2,
  };
}

export function startTournament(state) {
  const next = clone(state);
  if (next.players.length < 2) {
    throw new Error('Need at least 2 players to start');
  }

  next.totalPrizePool = money(next.entryFee * next.players.length);
  next.pairingOffset = 0;
  next.eliminationSeq = 0;
  if (isPayoutV2(next)) {
    const plan = attachPayoutPlan(next, next.players.length);
    next.prizeSchedule = plan.rr.schedule;
    next.prizeRoundsLeft = Math.max(1, next.prizeSchedule.length);
  } else {
    const places = assignPlacePrizes(next, computePlacePrizes({
      prizePool: next.totalPrizePool,
      placeCount: next.placeCount,
      playerCount: next.players.length,
      tournament: next,
    }));
    next.prizeSchedule = calculatePrizeDistribution(
      places.matchPool,
      Math.max(1, remainingEventRoundsFromState(next))
    );
    next.prizeRoundsLeft = Math.max(1, next.prizeSchedule.length);
  }

  next.stats = next.players.map((p) => ({
    player_id: p.id,
    player_name: p.name,
    wins: 0,
    losses: 0,
    koh_wins: 0,
    koh_losses: 0,
    total_payout: 0,
    place_bonus: 0,
    finish_place: null,
    eliminated: false,
    eliminated_at: null,
    eliminated_order: null,
    in_koh: false,
  }));

  next.rounds = [];
  next.matches = [];
  addRoundRobinRound(next);
  next.status = 'in-progress';
  next.message = 'Round 1 — all players in.';
  return maybeAdvance(next);
}

function rrPlayerList(stats) {
  return stats.map((p) => ({ id: p.player_id, name: p.player_name }));
}

function addRoundRobinRound(state) {
  const active = getActivePlayers(state);
  if (active.length < 2) return false;

  const roundNumber = state.rounds.filter((r) => !isKohRound(r)).length + 1;
  const pairing = pairOneRound(rrPlayerList(active), state.pairingOffset || 0);
  state.pairingOffset = (state.pairingOffset || 0) + 1;

  const used = new Set();
  const regular = [];
  for (const raw of pairing.matches || []) {
    const match = normalizeByeMatch(raw);
    if (match.isBye || !match.player2?.id || isByeName(match.player2?.name)) continue;
    const p1 = match.player1?.id;
    const p2 = match.player2?.id;
    if (!p1 || !p2 || p1 === p2) continue;
    if (used.has(p1) || used.has(p2)) continue;
    const s1 = findStat(state, p1);
    const s2 = findStat(state, p2);
    if (!s1 || s1.eliminated || !s2 || s2.eliminated) continue;
    used.add(p1);
    used.add(p2);
    regular.push({ player1: match.player1, player2: match.player2 });
  }
  const byePlayers = active.filter((p) => !used.has(p.player_id));
  if (!regular.length) return false;

  const roundId = uid();
  const gameType = getRoundGameType(roundNumber, state.gameType);
  if (roundNumber > 1) {
    consumePrizeRound(state);
  }
  const payouts = payoutsForNewRound(state, regular.length, byePlayers.length, false);
  const roundPrize = payouts.roundPrize;

  state.rounds.push({
    id: roundId,
    round_number: roundNumber,
    round_name: `Round ${roundNumber} (${gameType})`,
    game_type: gameType,
    prize_per_round: roundPrize,
    status: 'in-progress',
    koh_round_number: null,
  });

  let matchNumber = 1;
  regular.forEach((match) => {
    state.matches.push({
      id: uid(),
      round_id: roundId,
      round_number: roundNumber,
      match_number: matchNumber++,
      player1_id: match.player1.id,
      player1_name: match.player1.name,
      player2_id: match.player2.id,
      player2_name: match.player2.name,
      is_bye: false,
      winner_id: null,
      winner_name: null,
      loser_id: null,
      loser_name: null,
      score: null,
      payout_amount: payouts.perMatch,
      status: 'pending',
      completed_at: null,
    });
  });
  byePlayers.forEach((player) => {
    const row = {
      id: uid(),
      round_id: roundId,
      round_number: roundNumber,
      match_number: matchNumber++,
      player1_id: player.player_id,
      player1_name: player.player_name,
      player2_id: null,
      player2_name: null,
      is_bye: true,
      winner_id: null,
      winner_name: null,
      loser_id: null,
      loser_name: null,
      score: null,
      payout_amount: payouts.perBye,
      status: 'pending',
      completed_at: null,
    };
    applyByeWin(state, row);
    state.matches.push(row);
  });
  return true;
}

function dropGhostMatches(state) {
  const out = new Set((state.stats || []).filter((p) => p.eliminated).map((p) => p.player_id));
  const current = getCurrentRound(state);
  state.matches.forEach((match) => {
    if (match.status !== 'pending') return;
    const p1Out = match.player1_id ? out.has(match.player1_id) : true;
    const p2Out = match.player2_id ? out.has(match.player2_id) : false;
    if (!p1Out && !p2Out) return;

    const isCurrent = current && match.round_id === current.id;
    if (!isCurrent) {
      match.status = 'cancelled';
      return;
    }
    if (p1Out && (p2Out || !match.player2_id)) {
      match.status = 'cancelled';
      return;
    }
    const opponentId = p1Out ? match.player2_id : match.player1_id;
    const opponentName = p1Out ? match.player2_name : match.player1_name;
    if (!opponentId || out.has(opponentId)) {
      match.status = 'cancelled';
      return;
    }
    if (playerAlreadyInRound(state, match.round_id, opponentId, match.id)) {
      match.status = 'cancelled';
      return;
    }
    match.is_bye = true;
    match.player1_id = opponentId;
    match.player1_name = opponentName;
    match.player2_id = null;
    match.player2_name = null;
    match.loser_id = null;
    match.loser_name = null;
    applyByeWin(state, match);
  });
}

function findStat(state, playerId) {
  return state.stats.find((p) => p.player_id === playerId);
}

function eliminatePlayer(state, player, reasonLosses) {
  if (player.eliminated) return;
  player.eliminated = true;
  player.eliminated_at = new Date().toISOString();
  state.eliminationSeq = (state.eliminationSeq || 0) + 1;
  player.eliminated_order = state.eliminationSeq;
  player.elimination_losses = reasonLosses;
  dropGhostMatches(state);
}

function clearEliminationIfUnderLimit(player, losses, limit) {
  if (!player?.eliminated) return;
  if ((Number(losses) || 0) >= (Number(limit) || 0)) return;
  player.eliminated = false;
  player.eliminated_at = null;
  player.eliminated_order = null;
  player.elimination_losses = null;
}

function reverseMatchResult(state, match) {
  if (!match || match.status !== 'completed' || isByeMatch(match)) return;
  const round = state.rounds.find((r) => r.id === match.round_id);
  const koh = isKohRound(round);
  const winner = findStat(state, match.winner_id);
  const loser = findStat(state, match.loser_id);
  const paid = money(match.payout_amount);
  if (winner) {
    if (koh) winner.koh_wins = Math.max(0, (winner.koh_wins || 0) - 1);
    else winner.wins = Math.max(0, (winner.wins || 0) - 1);
    winner.total_payout = money(Math.max(0, (winner.total_payout || 0) - paid));
  }
  if (loser) {
    if (koh) {
      loser.koh_losses = Math.max(0, (loser.koh_losses || 0) - 1);
      clearEliminationIfUnderLimit(loser, loser.koh_losses, state.phase2EliminationLosses);
    } else {
      loser.losses = Math.max(0, (loser.losses || 0) - 1);
      clearEliminationIfUnderLimit(loser, loser.losses, state.phase1EliminationLosses);
    }
  }
  match.status = 'pending';
  match.winner_id = null;
  match.winner_name = null;
  match.loser_id = null;
  match.loser_name = null;
  match.score = null;
  match.completed_at = null;
}

function applyMatchWinner(state, match, winnerId, score) {
  const winnerIsP1 = winnerId === match.player1_id;
  const winnerName = winnerIsP1 ? match.player1_name : match.player2_name;
  const loserId = winnerIsP1 ? match.player2_id : match.player1_id;
  const loserName = winnerIsP1 ? match.player2_name : match.player1_name;
  if (!loserId || loserId === winnerId || isByeName(loserName)) {
    applyByeWin(state, match);
    return;
  }

  match.status = 'completed';
  match.winner_id = winnerId;
  match.winner_name = winnerName;
  match.loser_id = loserId;
  match.loser_name = loserName;
  match.score = score;
  match.completed_at = new Date().toISOString();

  const round = state.rounds.find((r) => r.id === match.round_id);
  const koh = isKohRound(round);
  const winner = findStat(state, winnerId);
  const loser = findStat(state, loserId);

  if (winner) {
    if (koh) winner.koh_wins = (winner.koh_wins || 0) + 1;
    else winner.wins += 1;
    match.payout_amount = creditPayout(state, winner, match.payout_amount, false, match);
  }
  if (loser && loser.player_id && loser.player_id !== winnerId) {
    if (koh) {
      loser.koh_losses = (loser.koh_losses || 0) + 1;
      if (loser.koh_losses >= state.phase2EliminationLosses) {
        eliminatePlayer(state, loser, loser.koh_losses);
      }
    } else {
      loser.losses += 1;
      if (loser.losses >= state.phase1EliminationLosses) {
        eliminatePlayer(state, loser, loser.losses);
      }
    }
  }
}

export function recordMatchResult(state, matchId, winnerId, score = null) {
  const next = clone(state);
  const match = next.matches.find((m) => m.id === matchId);
  if (!match) throw new Error('Match not found');
  if (next.status === 'completed') throw new Error('This tournament is already complete.');
  const current = getCurrentRound(next);
  if (!current || match.round_id !== current.id) {
    throw new Error('Only matches in the current round can be entered or edited.');
  }
  if (match.status === 'cancelled') throw new Error('That match is no longer open.');
  if (isByeMatch(match) || !match.player2_id || match.player1_id === match.player2_id) {
    applyByeWin(next, match);
    dropGhostMatches(next);
    return next;
  }
  if (match.status === 'completed') reverseMatchResult(next, match);
  applyMatchWinner(next, match, winnerId, score);
  dropGhostMatches(next);
  return next;
}

export function roundReadyToContinue(state) {
  if (!state || state.status === 'completed') return false;
  const current = getCurrentRound(state);
  if (!current) return false;
  return roundComplete(state, current);
}

export function continueCashClimb(state) {
  if (!state) throw new Error('No tournament to continue.');
  if (state.status === 'completed') throw new Error('This tournament is already complete.');
  const next = clone(state);
  if (!roundReadyToContinue(next)) {
    throw new Error('Finish every match in this round before continuing.');
  }
  return maybeAdvance(next);
}

function isKohRound(round) {
  return round && round.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName;
}

function roundComplete(state, round) {
  const matches = getRoundMatches(state, round.id);
  return matches.length > 0 && matches.every((m) => m.status === 'completed' || m.status === 'cancelled');
}

function completeTournament(state, winner) {
  const finishers = lastStandingFinishers(state.stats, winner);
  if (isPayoutV2(state)) {
    const awards = splitFinishAwards({
      rrSurplus: remainingPhaseBudget(state, false),
      kohSurplus: remainingPhaseBudget(state, true),
      firstMatchPaid: finishers[0]?.total_payout || 0,
      secondMatchPaid: finishers[1]?.total_payout || 0,
      thirdMatchPaid: finishers[2]?.total_payout || 0,
      otherMatchPaids: finishers.slice(3).map((p) => p.total_payout || 0),
    });
    assignPlacePrizes(state, {
      placeCount: 3,
      first: awards.championship,
      second: awards.second,
      third: awards.third,
      fourth: 0,
      potPercent: 0,
    });
  } else {
    assignPlacePrizes(state, computePlacePrizes({
      prizePool: remainingUnpaid(state),
      placeCount: state.placeCount,
      climbNeed: 0,
    }));
  }
  const prizes = state.placePrizes || {};
  const placeCount = parsePlaceCount(state.placeCount);
  finishers.forEach((player, index) => {
    const place = index + 1;
    if (place > placeCount) return;
    player.finish_place = place;
    if (place === 1) return;
    const amount = place === 2 ? prizes.second : place === 3 ? prizes.third : prizes.fourth;
    const paid = creditPayout(state, player, amount, true);
    player.place_bonus = money((player.place_bonus || 0) + paid);
  });
  if (winner) {
    winner.finish_place = 1;
    creditPayout(state, winner, remainingUnpaid(state), true);
  }
  state.status = 'completed';
  state.completedAt = new Date().toISOString();
  state.winner = winner
    ? { player_id: winner.player_id, player_name: winner.player_name, total_payout: winner.total_payout }
    : null;
  state.rounds.forEach((r) => {
    if (r.status !== 'completed') r.status = 'completed';
  });
  state.message = winner
    ? `${winner.player_name} wins Cash Climb.`
    : 'Tournament complete.';
  return state;
}

function pairKohMatches(state, round, activePlayers) {
  const active = (activePlayers || []).filter((p) => !p.eliminated);
  if (active.length < 2) return;
  const lastKoh = [...state.matches]
    .filter((m) => m.status === 'completed' && !m.is_bye && state.rounds.find((r) => r.id === m.round_id && isKohRound(r)))
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))[0];

  const pairs = [];
  if (active.length === 2) {
    pairs.push([active[0], active[1]]);
  } else if (active.length === 3) {
    let p1 = active[0];
    let p2 = active[1];
    if (lastKoh) {
      const winner = active.find((p) => p.player_id === lastKoh.winner_id);
      const sitting = active.find(
        (p) => p.player_id !== lastKoh.winner_id && p.player_id !== lastKoh.loser_id
      );
      if (winner && sitting) {
        p1 = winner;
        p2 = sitting;
      }
    }
    pairs.push([p1, p2]);
  } else {
    for (let i = 0; i < active.length; i += 2) {
      if (i + 1 < active.length) pairs.push([active[i], active[i + 1]]);
    }
  }

  const payouts = payoutsForNewRound(state, pairs.length, 0, true);
  round.prize_per_round = payouts.roundPrize;
  pairs.forEach(([p1, p2], index) => {
    state.matches.push({
      id: uid(),
      round_id: round.id,
      round_number: round.round_number,
      match_number: index + 1,
      player1_id: p1.player_id,
      player1_name: p1.player_name,
      player2_id: p2.player_id,
      player2_name: p2.player_name,
      is_bye: false,
      winner_id: null,
      winner_name: null,
      loser_id: null,
      loser_name: null,
      score: null,
      payout_amount: payouts.perMatch,
      status: 'pending',
      completed_at: null,
    });
  });
}

function startKingOfTheHill(state) {
  const active = getActivePlayers(state);
  if (active.length < 2) {
    return completeTournament(state, active[0] || null);
  }

  state.matches.forEach((match) => {
    const round = state.rounds.find((r) => r.id === match.round_id);
    if (match.status === 'pending' && !isKohRound(round)) match.status = 'cancelled';
  });
  state.rounds.forEach((r) => {
    if (!isKohRound(r) && r.status !== 'completed') r.status = 'completed';
  });

  state.kohPrizePool = isPayoutV2(state)
    ? remainingPhaseBudget(state, true)
    : remainingAfterReserved(state);
  state.kohPayouts = [];

  active.forEach((p) => {
    p.in_koh = true;
    p.koh_wins = 0;
    p.koh_losses = 0;
  });
  state.kohRoundPlan = Math.max(1, remainingEventRoundsFromState(state));

  const kohRound = {
    id: uid(),
    round_number: 999,
    round_name: OPEN_TOURNAMENT_STRUCTURE.finalStageName,
    game_type: state.gameType === 'mixed' ? '8-Ball' : state.gameType,
    prize_per_round: 0,
    status: 'in-progress',
    koh_round_number: 1,
  };
  state.rounds.push(kohRound);
  pairKohMatches(state, kohRound, active);
  state.message = `King of the Hill — ${active.length} players. KOH losses start at 0.`;
  return state;
}

function continueKingOfTheHill(state, currentRound) {
  const active = getActivePlayers(state);
  if (active.length <= 1) {
    currentRound.status = 'completed';
    return completeTournament(state, active[0] || null);
  }

  currentRound.status = 'completed';
  const nextKoh = {
    id: uid(),
    round_number: currentRound.round_number + 1,
    round_name: OPEN_TOURNAMENT_STRUCTURE.finalStageName,
    game_type: currentRound.game_type,
    prize_per_round: 0,
    status: 'in-progress',
    koh_round_number: (currentRound.koh_round_number || 1) + 1,
  };
  state.rounds.push(nextKoh);
  pairKohMatches(state, nextKoh, active);
  state.message = `King of the Hill continues — ${active.length} players left.`;
  return state;
}

function maybeAdvance(state, depth = 0) {
  dropGhostMatches(state);
  const current = getCurrentRound(state);
  if (!current || state.status === 'completed') return state;
  if (!roundComplete(state, current)) return state;
  if (depth > 40) return completeTournament(state, getActivePlayers(state)[0] || null);

  if (isKohRound(current)) {
    return continueKingOfTheHill(state, current);
  }

  current.status = 'completed';
  const active = getActivePlayers(state);
  const started = (state.stats || []).length;
  const threshold = getKOHThreshold(started, state);

  if (active.length <= 1) {
    return completeTournament(state, active[0] || null);
  }
  if (active.length <= threshold) {
    return startKingOfTheHill(state);
  }

  const added = addRoundRobinRound(state);
  if (!added) return startKingOfTheHill(state);
  const nextRound = getCurrentRound(state);
  state.message = `Round ${nextRound?.round_number} — ${active.length} players still in.`;
  return maybeAdvance(state, depth + 1);
}

function recountKohRecords(state) {
  (state.stats || []).forEach((p) => {
    p.koh_wins = 0;
    p.koh_losses = 0;
  });
  (state.matches || []).forEach((match) => {
    if (match.status !== 'completed' || match.is_bye) return;
    const round = (state.rounds || []).find((r) => r.id === match.round_id);
    if (!isKohRound(round)) return;
    const winner = findStat(state, match.winner_id);
    const loser = findStat(state, match.loser_id);
    if (winner) winner.koh_wins = (winner.koh_wins || 0) + 1;
    if (loser) loser.koh_losses = (loser.koh_losses || 0) + 1;
  });
}

function repairByeRecords(state) {
  (state.matches || []).forEach((match) => {
    const bye = isByeMatch(match) || (match.winner_id && match.winner_id === match.loser_id);
    if (!bye) return;
    match.is_bye = true;
    const creditedLoser = match.loser_id && findStat(state, match.loser_id);
    const winnerId = match.winner_id || match.player1_id;
    if (creditedLoser && (creditedLoser.player_id === winnerId || !match.player2_id || isByeName(match.player2_name))) {
      creditedLoser.losses = Math.max(0, (creditedLoser.losses || 0) - 1);
      if (creditedLoser.eliminated && creditedLoser.losses < (state.phase1EliminationLosses || 3)) {
        creditedLoser.eliminated = false;
        creditedLoser.eliminated_at = null;
        creditedLoser.eliminated_order = null;
      }
    }
    match.player2_id = null;
    match.player2_name = null;
    match.loser_id = null;
    match.loser_name = null;
  });
}

export function sanitizeCashClimb(state) {
  if (!state?.stats || !state.matches) return state;
  const next = clone(state);
  repairByeRecords(next);
  recountKohRecords(next);
  if (next.status !== 'in-progress') {
    dropGhostMatches(next);
    return next;
  }
  const kohStarted = (next.rounds || []).some(isKohRound);
  if (kohStarted) {
    next.matches.forEach((match) => {
      const round = next.rounds.find((r) => r.id === match.round_id);
      if (match.status === 'pending' && !isKohRound(round)) match.status = 'cancelled';
    });
  }
  dropGhostMatches(next);
  if (!next.lastRrPerWin) {
    next.lastRrPerWin = lastCompletedClimb(next, false).perWin;
  }
  if (!next.lastKohPerWin) {
    next.lastKohPerWin = lastCompletedClimb(next, true).perWin;
  }
  if (next.prizeRoundsLeft == null) {
    const planned = Math.max(1, (next.prizeSchedule || []).length);
    const completedRr = (next.rounds || []).filter((r) => !isKohRound(r) && r.status === 'completed').length;
    next.prizeRoundsLeft = Math.max(1, planned - completedRr);
  }
  recomputePendingRoundPayouts(next);
  return next;
}

export function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}
