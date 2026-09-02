function shuffle(list, random) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function pairKey(a, b) {
  return [String(a), String(b)].sort().join('|');
}

export function rrHistoryFromMatches(matches = []) {
  const played = new Set();
  const byes = new Map();
  matches.forEach((match) => {
    if (!match || match.status === 'cancelled') return;
    if (match.is_bye) {
      const id = String(match.player1_id || match.winner_id || '');
      if (!id) return;
      byes.set(id, (byes.get(id) || 0) + 1);
      return;
    }
    if (!match.player1_id || !match.player2_id) return;
    played.add(pairKey(match.player1_id, match.player2_id));
  });
  return { played, byes };
}

function pickBye(players, byeCounts, random) {
  const min = Math.min(...players.map((p) => byeCounts.get(String(p.id)) || 0));
  const candidates = players.filter((p) => (byeCounts.get(String(p.id)) || 0) === min);
  return candidates[Math.floor(random() * candidates.length)] || players[0];
}

function rematchCount(pairs, played) {
  return pairs.filter((pair) => played.has(pairKey(pair.player1.id, pair.player2.id))).length;
}

function greedyPair(order, played) {
  const used = new Set();
  const pairs = [];
  for (const player of order) {
    if (used.has(player.id)) continue;
    const opponents = order.filter((other) => other.id !== player.id && !used.has(other.id));
    opponents.sort((a, b) => {
      const aPlayed = played.has(pairKey(player.id, a.id)) ? 1 : 0;
      const bPlayed = played.has(pairKey(player.id, b.id)) ? 1 : 0;
      if (aPlayed !== bPlayed) return aPlayed - bPlayed;
      return 0;
    });
    const other = opponents[0];
    if (!other) continue;
    used.add(player.id);
    used.add(other.id);
    pairs.push({ player1: player, player2: other, isBye: false });
  }
  return pairs;
}

/**
 * Shuffle remaining RR players each round. Prefer opponents they have not
 * already played; rematch only when a full fresh pairing is impossible.
 */
export function pairRrRound(players, history = {}, random = Math.random) {
  const pool = (players || []).filter((player) => player?.id);
  if (pool.length < 2) return { matches: [], bye: null };

  const shuffled = shuffle(pool, random);
  const played = history.played instanceof Set ? history.played : new Set();
  const byeCounts = history.byes instanceof Map ? history.byes : new Map();

  let bye = null;
  let rest = shuffled;
  if (rest.length % 2 === 1) {
    bye = pickBye(rest, byeCounts, random);
    rest = shuffled.filter((player) => player.id !== bye.id);
  }

  const attempts = Math.min(80, Math.max(16, rest.length * 5));
  let best = greedyPair(rest, played);
  let bestRematches = rematchCount(best, played);
  for (let i = 1; i < attempts && bestRematches > 0; i += 1) {
    const candidate = greedyPair(shuffle(rest, random), played);
    const rematches = rematchCount(candidate, played);
    if (rematches < bestRematches) {
      best = candidate;
      bestRematches = rematches;
    }
  }

  return { matches: best, bye };
}
