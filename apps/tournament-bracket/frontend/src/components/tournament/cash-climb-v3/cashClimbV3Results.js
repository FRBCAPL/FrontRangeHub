/**
 * Operator-submitted match results for Cash Climb V3, validated against the two players in the match.
 *
 *   { outcome: 'completed', winner, loserRacks }            valid score: winner R, loser 0..R-1
 *   { outcome: 'forfeit', forfeiting }                      single pre-match forfeit
 *   { outcome: 'double-forfeit' }                           both forfeit before play: no winner
 *   { outcome: 'withdrawal', withdrawing, racks }           one player withdraws mid-match
 *   { outcome: 'double-withdrawal', racks }                 both withdraw mid-match: no winner
 * `racks` maps each player id to racks won when play stopped (0..R-1; neither player had reached R).
 *
 * Vacant-position outcomes ('walkover', 'void') are never submitted; progression applies them.
 */
export const SUBMITTED_OUTCOMES = Object.freeze(['completed', 'forfeit', 'double-forfeit', 'withdrawal', 'double-withdrawal']);

function racksOf(raw, players, raceTo) {
  if (!raw || typeof raw !== 'object') throw new Error('Rack counts for both players are required.');
  const keys = Object.keys(raw);
  if (keys.length !== 2 || !players.every((p) => keys.includes(p))) throw new Error('Rack counts must name exactly the two players in the match.');
  const racks = {};
  players.forEach((p) => {
    const n = raw[p];
    if (!Number.isSafeInteger(n) || n < 0 || n >= raceTo) throw new Error(`Racks won must be a whole number from 0 to ${raceTo - 1}.`);
    racks[p] = n;
  });
  return racks;
}

function pick(players, id, role) {
  if (!players.includes(id)) throw new Error(`The ${role} must be one of the two players in the match.`);
  return [id, players.find((p) => p !== id)];
}

/** Canonical result for two seated players. Throws a plain-English error when invalid. */
export function normalizeResult(result, players, raceTo) {
  const outcome = result?.outcome;
  if (!SUBMITTED_OUTCOMES.includes(outcome)) throw new Error('Choose a valid match outcome.');
  switch (outcome) {
    case 'completed': {
      const [winner, loser] = pick(players, result.winner, 'winner');
      const L = result.loserRacks;
      if (!Number.isSafeInteger(L) || L < 0 || L >= raceTo) throw new Error(`The losing player's racks must be a whole number from 0 to ${raceTo - 1}.`);
      return { outcome, winner, loser, loserRacks: L };
    }
    case 'forfeit': {
      const [forfeiting, winner] = pick(players, result.forfeiting, 'forfeiting player');
      return { outcome, winner, forfeiting };
    }
    case 'double-forfeit':
      return { outcome, winner: null };
    case 'withdrawal': {
      const [withdrawing, winner] = pick(players, result.withdrawing, 'withdrawing player');
      return { outcome, winner, withdrawing, racks: racksOf(result.racks, players, raceTo) };
    }
    default:
      return { outcome, winner: null, racks: racksOf(result.racks, players, raceTo) };
  }
}

const canonical = (r) => JSON.stringify(r, Object.keys(r).sort()) + JSON.stringify(r.racks ? Object.entries(r.racks).sort() : null);

export const sameResult = (a, b) => canonical(a) === canonical(b);
