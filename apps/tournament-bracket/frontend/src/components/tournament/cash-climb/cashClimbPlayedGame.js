import { CASH_CLIMB_PLAYED_GAMES } from './openTournamentStructure.js';

const GAME_TAG = /\[(8-Ball|9-Ball|10-Ball)\]\s*$/;

export function normalizePlayedGame(value) {
  const played = String(value || '').trim();
  return CASH_CLIMB_PLAYED_GAMES.includes(played) ? played : '';
}

export function playedGameFromMatch(match) {
  return normalizePlayedGame(match?.played_game || match?.playedGame);
}

export function playedGameFromExtras(extras) {
  if (!extras || typeof extras !== 'object') return undefined;
  if ('playedGame' in extras) return normalizePlayedGame(extras.playedGame);
  if ('played_game' in extras) return normalizePlayedGame(extras.played_game);
  if ('game_type' in extras) return normalizePlayedGame(extras.game_type);
  return undefined;
}

export function tagSubmittedBy(name, playedGame) {
  const base = String(name || '').replace(GAME_TAG, '').trim();
  const game = normalizePlayedGame(playedGame);
  if (!game) return base || null;
  return base ? `${base} [${game}]` : `[${game}]`;
}

export function pendingSubmitterName(row) {
  return String(row?.submitted_by || '').replace(GAME_TAG, '').trim();
}

export function playedGameFromPending(row) {
  return normalizePlayedGame(
    row?.game_type || row?.played_game || row?.playedGame || String(row?.submitted_by || '').match(GAME_TAG)?.[1]
  );
}

export function playedGameFromForm(form, fallback = '') {
  const field = form?.elements?.namedItem?.('playedGame') || form?.elements?.playedGame;
  const value = field && 'value' in field ? field.value : fallback;
  return normalizePlayedGame(value || fallback);
}
