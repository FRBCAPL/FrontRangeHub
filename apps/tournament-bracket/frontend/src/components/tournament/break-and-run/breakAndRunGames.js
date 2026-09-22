export const BREAK_AND_RUN_GAMES = [
  { id: '9-ball', name: '9-Ball', ballCount: 9 },
  { id: '10-ball', name: '10-Ball', ballCount: 10 },
  { id: '8-ball', name: '8-Ball (7 + 8-ball)', ballCount: 8 },
  { id: '8-ball-15', name: '8-Ball (15 balls)', ballCount: 15 },
  { id: 'straight', name: '14.1 / Straight Pool', ballCount: 15 },
  { id: 'one-pocket', name: 'One Pocket', ballCount: 8 },
  { id: 'banks', name: 'Banks', ballCount: 8 },
  { id: 'custom', name: 'Custom game', ballCount: 9 },
];

export function gameById(id) {
  return BREAK_AND_RUN_GAMES.find((g) => g.id === id) || BREAK_AND_RUN_GAMES[0];
}

export function resolveGame({ gameId, gameName, ballCount } = {}) {
  const preset = gameById(gameId);
  const custom = String(gameId || '') === 'custom';
  const n = Math.round(Number(ballCount));
  const balls = Number.isFinite(n) && n >= 1 ? Math.min(30, n) : preset.ballCount;
  return {
    gameId: preset.id,
    gameName: custom
      ? (String(gameName || '').trim() || 'Custom game')
      : preset.name,
    ballCount: balls,
  };
}
