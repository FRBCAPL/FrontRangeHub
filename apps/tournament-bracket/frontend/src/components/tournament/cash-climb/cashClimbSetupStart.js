/**
 * Starting values for CashClimbSetup. Without a prefill these are the normal defaults. A Smart Builder
 * prefill only changes the races, tables and entry fee; anything missing or invalid keeps the default,
 * and every value stays editable with the usual controls.
 */
import { OPEN_TOURNAMENT_STRUCTURE } from './openTournamentStructure.js';
import { defaultKohRaceTo, defaultRrRaceTo, raceModeFrom, requireRaceTo } from './cashClimbRace.js';

export const TABLE_PRESET_MAX = 12;

function raceStart(value, fallback) {
  try {
    const n = requireRaceTo(value);
    const mode = raceModeFrom(n);
    return { mode, other: mode === 'other' ? String(n) : '' };
  } catch (_) {
    return { mode: String(fallback), other: '' };
  }
}

function tableStart(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return { mode: '4', other: '' };
  return n <= TABLE_PRESET_MAX ? { mode: String(n), other: '' } : { mode: 'other', other: String(n) };
}

export function cashClimbSetupStart(prefill = null) {
  const builder = prefill?.family === 'cash-climb' && prefill.settings ? prefill : null;
  const s = builder?.settings || {};
  const rr = raceStart(s.raceTo, defaultRrRaceTo());
  const koh = raceStart(s.kohRaceTo, defaultKohRaceTo());
  const tables = tableStart(s.tableCount);
  const fee = Number(s.entryFee);
  const players = Number(builder?.plannedPlayers);
  return {
    fromBuilder: Boolean(builder),
    raceToMode: rr.mode,
    otherRaceTo: rr.other,
    kohRaceToMode: koh.mode,
    otherKohRaceTo: koh.other,
    tableCountMode: tables.mode,
    otherTableCount: tables.other,
    entryFee: Number.isFinite(fee) && fee >= 0 ? String(fee) : String(OPEN_TOURNAMENT_STRUCTURE.entryFee),
    plannedPlayers: builder && Number.isInteger(players) && players > 0 ? players : null,
  };
}
