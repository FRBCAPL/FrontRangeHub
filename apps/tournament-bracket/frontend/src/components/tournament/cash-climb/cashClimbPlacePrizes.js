import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { climbNeedForField } from './cashClimbDuration.js';

function money(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export function parsePlaceCount(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(4, n);
}

export function maxPlaceCount(playerCount) {
  const n = Math.round(Number(playerCount) || 0);
  if (n < 2) return 4;
  return Math.min(4, n);
}

export function placeOrdinal(place) {
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  if (place === 4) return '4th';
  return String(place);
}

/** Who lasted longest in KOH. Not cash rank. */
export function finishPlaceLabel(place) {
  if (place === 1) return 'Last standing';
  if (place === 2) return '2nd last standing';
  if (place === 3) return '3rd last standing';
  return placeOrdinal(place);
}

/** Leftover award buckets, not people. */
export function leftoverAwardLabel(place) {
  if (place === 1) return 'Last standing leftover';
  if (place === 2) return '2nd last leftover';
  if (place === 3) return '3rd last leftover';
  return `${placeOrdinal(place)} leftover`;
}

export function lastStandingSplitNote(placeCount) {
  const count = parsePlaceCount(placeCount);
  if (count <= 1) return 'all to the winner';
  if (count === 2) return 'split 35 / 65 — 2nd gets the larger leftover share';
  if (count === 3) return 'split 22 / 48 / 30 — 2nd gets the largest leftover share';
  return 'split 20 / 50 / 18 / 12 — 2nd gets half the leftover';
}

/**
 * Fund the $2 + $1 climb first. Leftover after that climb is last standing.
 * Pass `climbNeed` for a live remaining path, or `playerCount` for the start-of-event plan.
 */
export function computePlacePrizes({
  prizePool,
  placeCount,
  climbNeed = null,
  playerCount = 0,
  tournament = null,
  lastPerWin = 0,
} = {}) {
  const pool = money(prizePool);
  const count = parsePlaceCount(placeCount);
  const need = climbNeed != null && Number.isFinite(Number(climbNeed))
    ? Math.max(0, Math.round(Number(climbNeed) || 0))
    : climbNeedForField(playerCount, tournament, lastPerWin);
  const matchPool = money(Math.min(pool, need));
  const leftover = money(Math.max(0, pool - matchPool));
  const splits = OPEN_TOURNAMENT_STRUCTURE.placeSplits?.[count] || OPEN_TOURNAMENT_STRUCTURE.placeSplits[1];
  let first = money(leftover * (splits[0] || 1));
  let second = count >= 2 ? money(leftover * (splits[1] || 0)) : 0;
  let third = count >= 3 ? money(leftover * (splits[2] || 0)) : 0;
  let fourth = count >= 4 ? money(leftover * (splits[3] || 0)) : 0;
  const reserved = money(first + second + third + fourth);
  const drift = money(leftover - reserved);
  if (drift) first = money(first + drift);

  return {
    placeCount: count,
    first,
    second,
    third,
    fourth,
    reserved: money(first + second + third + fourth),
    matchPool: money(Math.max(0, pool - first - second - third - fourth)),
    potPercent: pool > 0 ? money((money(first + second + third + fourth) / pool) * 100) : 0,
    climbNeed: need,
    extrasScaled: false,
  };
}

export function reservedPlaceTotal(state) {
  const places = state?.placePrizes;
  if (places) {
    return money(
      (Number(places.first) || 0)
      + (Number(places.second) || 0)
      + (Number(places.third) || 0)
      + (Number(places.fourth) || 0)
    );
  }
  return money(state?.firstPlacePrize || 0);
}

export function lastStandingFinishers(stats, winner) {
  const list = stats || [];
  const winnerId = winner?.player_id;
  const champ = list.find((p) => p.player_id === winnerId) || winner || null;
  const others = list.filter((p) => p && p.player_id !== winnerId);
  const stillIn = others.filter((p) => !p.eliminated);
  const outs = others.filter((p) => p.eliminated).sort((a, b) => {
    const ao = Number(a.eliminated_order);
    const bo = Number(b.eliminated_order);
    if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) return bo - ao;
    return String(b.eliminated_at || '').localeCompare(String(a.eliminated_at || ''));
  });
  return [champ, ...stillIn, ...outs].filter(Boolean);
}

export function listedPlacePrizes(places) {
  if (!places) return [];
  return [1, 2, 3, 4]
    .map((place) => {
      const key = place === 1 ? 'first' : place === 2 ? 'second' : place === 3 ? 'third' : 'fourth';
      const amount = money(places[key] || 0);
      return amount > 0 ? { place, label: placeOrdinal(place), amount } : null;
    })
    .filter(Boolean);
}
