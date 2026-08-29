import {
  calculatePrizeDistribution,
} from './cashClimbSchedule.js';
import {
  computePlacePrizes,
  maxPlaceCount,
  parsePlaceCount,
} from './cashClimbPlacePrizes.js';
import { remainingEventRoundsFromState } from './cashClimbDuration.js';
import { recomputePendingRoundPayouts } from './cashClimbEngine.js';
import { attachPayoutPlan, isPayoutV2 } from './cashClimbPayoutRuntime.js';
import { applyPlayerNames } from './cashClimbRename.js';
import { requireRaceTo } from './cashClimbRace.js';

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function clone(state) {
  return JSON.parse(JSON.stringify(state));
}

function parseTableCount(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) throw new Error('Enter a table count of at least 1.');
  if (n > 48) throw new Error('Table count cannot be more than 48.');
  return n;
}

function paidOutTotal(state) {
  return money((state.stats || []).reduce((sum, p) => sum + (Number(p.total_payout) || 0), 0));
}

export function cashClimbHasPlayedMatch(state) {
  return (state.matches || []).some((m) => m.status === 'completed' && !m.is_bye);
}

export function cashClimbMoneyLocked(state) {
  if (!state || state.status === 'completed') return true;
  if (cashClimbHasPlayedMatch(state)) return true;
  return paidOutTotal(state) > 0.001;
}

export function updateOpenTournament(state, patch = {}) {
  if (!state) throw new Error('No tournament to edit.');
  const next = clone(state);

  const name = String(patch.name ?? next.name ?? '').trim();
  if (!name) throw new Error('Enter a tournament name.');
  next.name = name;

  const date = String(patch.tournamentDate ?? next.tournamentDate ?? '').slice(0, 10);
  if (!date) throw new Error('Pick the tournament date.');
  next.tournamentDate = date;

  const gameType = patch.gameType ?? next.gameType;
  if (!['8-Ball', '9-Ball', '10-Ball', 'mixed'].includes(gameType)) {
    throw new Error('Pick a game type.');
  }
  next.gameType = gameType;
  next.raceTo = requireRaceTo(patch.raceTo ?? next.raceTo);
  next.kohRaceTo = requireRaceTo(patch.kohRaceTo ?? next.kohRaceTo ?? next.raceTo);
  next.tableCount = parseTableCount(patch.tableCount ?? next.tableCount);

  if (!cashClimbMoneyLocked(next)) {
    const entryFee = Number(patch.entryFee ?? next.entryFee);
    if (!Number.isFinite(entryFee) || entryFee < 0) {
      throw new Error('Enter an entry fee of 0 or more.');
    }
    next.entryFee = money(entryFee);
    next.totalPrizePool = money(next.entryFee * (next.players || []).length);

    if (isPayoutV2(next)) {
      const plan = attachPayoutPlan(next, (next.players || []).length);
      next.prizeSchedule = plan.rr.schedule;
      next.prizeRoundsLeft = Math.max(1, next.prizeSchedule.length);
    } else {
      const placeCount = Math.min(
        parsePlaceCount(patch.placeCount ?? next.placeCount),
        maxPlaceCount((next.players || []).length)
      );
      const places = computePlacePrizes({
        prizePool: next.totalPrizePool,
        placeCount,
        playerCount: (next.players || []).length,
        tournament: next,
      });
      next.placeCount = places.placeCount;
      next.firstPlacePrize = places.first;
      next.firstPlacePercent = places.potPercent;
      next.placePrizes = {
        first: places.first,
        second: places.second,
        third: places.third,
        fourth: places.fourth,
      };
      next.prizeSchedule = calculatePrizeDistribution(
        places.matchPool,
        Math.max(1, remainingEventRoundsFromState(next))
      );
      next.prizeRoundsLeft = Math.max(1, next.prizeSchedule.length);
    }
    recomputePendingRoundPayouts(next);
  }

  if (Array.isArray(patch.playerNames)) {
    applyPlayerNames(next, patch.playerNames);
  }

  return next;
}
