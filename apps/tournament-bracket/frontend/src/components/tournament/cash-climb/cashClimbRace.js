import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';

export const RACE_TO_PRESETS = ['1', '2', '3', '4', '5'];

export function parseRaceTo(value, fallback = 1) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return Math.max(1, Math.round(Number(fallback) || 1));
  return Math.min(21, n);
}

export function requireRaceTo(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) throw new Error('Enter a race-to of at least 1.');
  if (n > 21) throw new Error('Race-to cannot be more than 21.');
  return n;
}

export function defaultRrRaceTo() {
  return parseRaceTo(OPEN_TOURNAMENT_STRUCTURE.gameRules.raceTo, 1);
}

export function defaultKohRaceTo() {
  return parseRaceTo(OPEN_TOURNAMENT_STRUCTURE.gameRules.kohRaceTo, 2);
}

export function cashClimbRrRaceTo(state) {
  return parseRaceTo(state?.raceTo, defaultRrRaceTo());
}

/** Old events had one race for both phases; keep that until KOH is saved separately. */
export function cashClimbKohRaceTo(state) {
  if (state?.kohRaceTo != null && state.kohRaceTo !== '') {
    return parseRaceTo(state.kohRaceTo, defaultKohRaceTo());
  }
  if (state?.raceTo != null && state.raceTo !== '') {
    return parseRaceTo(state.raceTo, defaultKohRaceTo());
  }
  return defaultKohRaceTo();
}

export function roundIsKoh(round) {
  return Boolean(
    round
    && (round.koh_round_number != null || round.round_name === OPEN_TOURNAMENT_STRUCTURE.finalStageName)
  );
}

export function raceToForMatch(tournament, match) {
  const round = (tournament?.rounds || []).find((r) => r.id === match?.round_id);
  return roundIsKoh(round) ? cashClimbKohRaceTo(tournament) : cashClimbRrRaceTo(tournament);
}

export function formatRaceLabel(raceTo) {
  const n = parseRaceTo(raceTo, 1);
  return n === 1 ? '1 game' : `Race to ${n}`;
}

export function formatRacePhrase(raceTo) {
  const n = parseRaceTo(raceTo, 1);
  return n === 1 ? '1 game' : `race to ${n}`;
}

export function formatEventRaces(rrRaceTo, kohRaceTo) {
  return `RR ${formatRacePhrase(rrRaceTo)} • KOH ${formatRacePhrase(kohRaceTo)}`;
}

export function raceModeFrom(value, fallback = 1) {
  const n = String(parseRaceTo(value, fallback));
  return RACE_TO_PRESETS.includes(n) ? n : 'other';
}

export function raceOptionLabel(preset) {
  return String(preset) === '1' ? '1 game' : `Race to ${preset}`;
}
