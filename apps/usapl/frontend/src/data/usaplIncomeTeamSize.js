import { usaplPlayMatches } from './usaplIncomePlayType.js';

export const USAPL_COMMON_TEAM_SIZES = [4, 5];

export function normalizeUsaplTeamPlayers(value) {
  const n = Number.parseInt(String(value || '').trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function oneMatchTeamDuesCents(playerDuesCents, players) {
  const dues = Number(playerDuesCents) || 0;
  const count = normalizeUsaplTeamPlayers(players);
  if (dues < 1 || !count) return 0;
  return dues * count;
}

export function weeklyTeamDuesCents(playerDuesCents, players, playType = 'single') {
  return oneMatchTeamDuesCents(playerDuesCents, players) * usaplPlayMatches(playType);
}
