import { PAYOUT_MODEL_V2 } from './cashClimbPayoutConfig.js';
import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { roundWinCost } from './cashClimbClimb.js';
import { buildPayoutPlan, kohPerWin, rrHoldPerWin } from './cashClimbAllocations.js';

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export function isPayoutV2(state) {
  return state?.payoutModel === PAYOUT_MODEL_V2;
}

function isKohRound(round) {
  return round && round.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName;
}

export function attachPayoutPlan(state, playerCount = 0) {
  const count = playerCount || (state.players || []).length || (state.stats || []).length;
  const plan = buildPayoutPlan({
    prizePool: state.totalPrizePool,
    playerCount: count,
    tournament: state,
  });
  state.payoutModel = PAYOUT_MODEL_V2;
  state.rrBudget = plan.rrBudget;
  state.kohBudget = plan.kohBudget;
  state.rrSpendable = plan.rrSpendable;
  state.rrPodiumReserve = plan.podiumReserve;
  state.rrSchedule = plan.rr.schedule;
  state.kohSchedule = plan.kohSchedule;
  state.championshipFloor = plan.championshipFloor;
  state.placeCount = 3;
  state.firstPlacePrize = plan.championshipFloor;
  state.firstPlacePercent = 0;
  state.placePrizes = {
    first: plan.championshipFloor,
    second: 0,
    third: 0,
    fourth: 0,
  };
  return plan;
}

export function phasePaid(state, koh, exceptMatchId = null) {
  const rounds = state?.rounds || [];
  const matches = state?.matches || [];
  return money(matches.reduce((sum, match) => {
    if (exceptMatchId && match.id === exceptMatchId) return sum;
    if (match.status !== 'completed') return sum;
    const round = rounds.find((r) => r.id === match.round_id);
    if (Boolean(isKohRound(round)) !== Boolean(koh)) return sum;
    return sum + (Number(match.payout_amount) || 0);
  }, 0));
}

export function remainingPhaseBudget(state, koh, exceptMatchId = null) {
  const budget = koh ? Number(state.kohBudget) || 0 : Number(state.rrBudget) || 0;
  return money(Math.max(0, budget - phasePaid(state, koh, exceptMatchId)));
}

export function remainingMatchBudget(state, koh, exceptMatchId = null) {
  if (koh) return remainingPhaseBudget(state, true, exceptMatchId);
  const spendable = Number(state.rrSpendable);
  const budget = Number.isFinite(spendable) ? spendable : Number(state.rrBudget) || 0;
  return money(Math.max(0, budget - phasePaid(state, false, exceptMatchId)));
}

function completedRrRoundCount(state) {
  return (state?.rounds || []).filter((r) => !isKohRound(r) && r.status === 'completed').length;
}

function completedKohPlayableCount(state) {
  return (state?.matches || []).filter((match) => {
    if (match.status !== 'completed' || match.is_bye) return false;
    const round = (state.rounds || []).find((r) => r.id === match.round_id);
    return isKohRound(round);
  }).length;
}

export function lockedRoundPayouts(state, numMatches, numByes, koh = false) {
  const remaining = remainingMatchBudget(state, koh);
  const matches = Math.max(0, Math.round(Number(numMatches) || 0));
  const byes = Math.max(0, Math.round(Number(numByes) || 0));
  let perMatch = koh
    ? kohPerWin({ kohSchedule: state.kohSchedule }, completedKohPlayableCount(state))
    : rrHoldPerWin({ rr: { schedule: state.rrSchedule || [] } }, completedRrRoundCount(state));

  let cost = roundWinCost(perMatch, matches, byes);
  if (cost > remaining + 0.001) {
    for (let w = perMatch; w >= 0; w -= 1) {
      if (roundWinCost(w, matches, byes) <= remaining + 0.001) {
        perMatch = w;
        cost = roundWinCost(w, matches, byes);
        break;
      }
    }
  }

  return {
    perMatch,
    perBye: Math.floor(perMatch / 2),
    roundPrize: money(Math.min(remaining, cost)),
  };
}
