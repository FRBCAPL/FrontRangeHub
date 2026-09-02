export function isElimNamedPlayer(name) {
  const n = String(name || '').trim();
  return Boolean(n && n !== 'Bye' && n !== '—' && n !== 'TBD');
}

export function parseElimScore(p1Games, p2Games, winnerId, player1Id, player2Id) {
  if (p1Games === '' || p2Games === '') {
    return { ok: false, error: 'Enter games for both players.' };
  }
  const p1 = Number(p1Games);
  const p2 = Number(p2Games);
  if (!Number.isInteger(p1) || !Number.isInteger(p2) || p1 < 0 || p2 < 0) {
    return { ok: false, error: 'Enter whole-number games for both players.' };
  }
  if (!winnerId) {
    return { ok: false, error: 'Pick a winner.' };
  }
  const winnerGames = String(winnerId) === String(player1Id) ? p1 : p2;
  const loserGames = String(winnerId) === String(player1Id) ? p2 : p1;
  if (winnerGames <= loserGames) {
    return { ok: false, error: 'The winner must have more games than the other player.' };
  }
  return { ok: true, score: `${p1}-${p2}` };
}

export function gamesFromElimScore(score) {
  const parts = String(score || '').trim().split(/\s*[-–]\s*/);
  if (parts.length !== 2 || parts[0] === '' || parts[1] === '') return { p1: '', p2: '' };
  return { p1: parts[0], p2: parts[1] };
}
