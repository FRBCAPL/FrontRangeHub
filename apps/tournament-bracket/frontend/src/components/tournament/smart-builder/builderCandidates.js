/**
 * Candidate space: only settings the existing setup screens can hold. Original Cash Climb and Showdown
 * V1, V2 and V3. V4 is on hold and never generated.
 */
import { V3_QUALIFYING_GAMES, V3_PLAYOFF_RACE_TO } from '../showdown/v3/showdownV3Rules.js';

export const CASH_CLIMB_RACES = [[1, 1], [1, 2], [1, 3], [2, 2], [2, 3], [3, 3]];
export const SHOWDOWN_RACE_FORMATS = [1, 2];
export const SHOWDOWN_RACES = { qualifyingRaceTo: 3, playoffRaceTo: 5 };

const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
export const V3_GAMES = range(V3_QUALIFYING_GAMES.min, V3_QUALIFYING_GAMES.max);
export const V3_RACES = range(V3_PLAYOFF_RACE_TO.min, V3_PLAYOFF_RACE_TO.max);

export const familyOf = (c) => (c.family === 'cash-climb' ? 'Cash Climb King of the Hill' : `Showdown V${c.version}`);

export function candidateList() {
  const list = CASH_CLIMB_RACES.map(([raceTo, kohRaceTo]) => ({
    family: 'cash-climb', id: `cc-${raceTo}-${kohRaceTo}`, label: `Cash Climb King of the Hill race ${raceTo} / King of the Hill race ${kohRaceTo}`, raceTo, kohRaceTo,
  }));
  SHOWDOWN_RACE_FORMATS.forEach((version) => list.push({
    family: 'showdown', version, id: `v${version}`, label: `Showdown V${version} race ${SHOWDOWN_RACES.qualifyingRaceTo} / race ${SHOWDOWN_RACES.playoffRaceTo}`, ...SHOWDOWN_RACES,
  }));
  V3_RACES.forEach((k) => V3_GAMES.forEach((g) => list.push({
    family: 'showdown', version: 3, id: `v3-${g}-${k}`, label: `Showdown V3 ${g} games / race ${k}`, qualifyingGames: g, playoffRaceTo: k,
  })));
  return list;
}

/** Worst case if every match is played (withdrawals and a Cash Climb chop excepted). */
export function guarantees(c) {
  if (c.family === 'cash-climb') return { matches: 3, games: 3 * c.raceTo, finalRace: c.kohRaceTo };
  if (c.version === 3) return { matches: 2, games: 2 * c.qualifyingGames, finalRace: c.playoffRaceTo };
  return { matches: 2, games: 2 * c.qualifyingRaceTo, finalRace: c.playoffRaceTo };
}

/** Labels, never bans: every legal setting stays eligible. */
export function candidateFlags(c) {
  const flags = [];
  if (c.family === 'cash-climb' && c.kohRaceTo === 1) flags.push({ key: 'short-championship', text: 'Short championship: King of the Hill race 1' });
  return flags;
}
