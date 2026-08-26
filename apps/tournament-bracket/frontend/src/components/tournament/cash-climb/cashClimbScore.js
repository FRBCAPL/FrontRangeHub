/**
 * Optional match score: blank is allowed. A filled score must be two whole numbers
 * in player-1 then player-2 order, race-to legal, and matching the selected winner.
 */
export function parseOptionalMatchScore(raw, { raceTo, winnerId, player1Id, player2Id } = {}) {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: true, score: null };

  const parsed = text.match(/^(\d+)\s*[-–:xX/]\s*(\d+)$/);
  if (!parsed) {
    return { ok: false, error: 'Enter a score like 5-3, or leave it blank.' };
  }

  const p1 = Number(parsed[1]);
  const p2 = Number(parsed[2]);
  if (!Number.isInteger(p1) || !Number.isInteger(p2)) {
    return { ok: false, error: 'Enter whole-number games, like 5-3.' };
  }

  const race = Math.max(1, Math.round(Number(raceTo) || 0));
  if (!race) return { ok: true, score: `${p1}-${p2}` };

  if (!winnerId || (winnerId !== player1Id && winnerId !== player2Id)) {
    return { ok: false, error: 'Pick a winner before entering a score.' };
  }

  const winnerGames = winnerId === player1Id ? p1 : p2;
  const loserGames = winnerId === player1Id ? p2 : p1;

  if (loserGames === race && winnerGames < race) {
    return {
      ok: false,
      error: 'That score belongs to the other player. Pick the matching winner, or change the score.',
    };
  }
  if (winnerGames !== race) {
    return { ok: false, error: `The winner must reach ${race} games (race to ${race}).` };
  }
  if (loserGames < 0 || loserGames >= race) {
    return { ok: false, error: `The other player can have 0–${race - 1} games.` };
  }

  return { ok: true, score: `${p1}-${p2}` };
}
